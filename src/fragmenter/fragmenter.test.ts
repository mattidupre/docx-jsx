import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../fixtures/browserHarness';
import { COLUMNS_DATA_ATTRIBUTES, type UnitsSize } from '../entities';
import type { FragmentationLayout } from './model';
import type * as fragmenterModule from './fragmenter';
import type * as profilesModule from './profiles';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type FragmenterApi = typeof fragmenterModule & typeof profilesModule;

type StackInput = {
  html: string;
  continuous: boolean;
  /** The content size of the pages this stack starts. */
  width: UnitsSize;
  height: UnitsSize;
  /** The content width of the pages it owns but does not start, if another. */
  subsequentWidth?: UnitsSize;
};

type FragmentedResult = {
  pages: Array<string>;
  starts: Array<{ pageIndex: number; stackIndex: number; first: boolean }>;
  /** Per page, the `offsetWidth` of every `[data-width-probe]` element. */
  probeWidths: Array<Array<number>>;
  /** Per page, how far down the lowest border box of its content reaches. */
  extents: Array<number>;
  /** Per page, the `start` of every `<ol>`. */
  listStarts: Array<Array<number>>;
  /** Per page, where every `<p>` is drawn, from the top of the page. */
  paragraphs: Array<Array<{ top: number; height: number }>>;
  layout: FragmentationLayout;
};

/**
 * A 9in content box is 864px tall, so it holds ten of these lines and a
 * little more. Fixed heights keep the tests independent of the font Chrome
 * happens to use.
 */
const LINE_HEIGHT_PX = 80;

const PAGE = { width: '6.5in', height: '9in' } as const;

const lines = (prefix: string, count: number) =>
  Array.from(
    { length: count },
    (_value, index) =>
      `<div style="margin:0;height:${LINE_HEIGHT_PX}px;">${prefix}${index}</div>`,
  ).join('');

const texts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_value, index) => `${prefix}${index}`);

describe('Fragmenter', () => {
  let browser: Browser;
  let harness: BrowserHarness<FragmenterApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<FragmenterApi>(browser, {
      modules: ['./fragmenter', './profiles'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  const fragment = (stacks: ReadonlyArray<StackInput>, profileName = 'word') =>
    harness.evaluate(
      async (
        api,
        stackInputs: ReadonlyArray<StackInput>,
        name: string,
      ): Promise<FragmentedResult> => {
        const pages: Array<string> = [];
        const starts: FragmentedResult['starts'] = [];
        const probeWidths: Array<Array<number>> = [];
        const extents: Array<number> = [];
        const listStarts: Array<Array<number>> = [];
        const paragraphs: FragmentedResult['paragraphs'] = [];
        const pageSizes: Array<{ width: UnitsSize; height: UnitsSize }> = [];

        const layout = await new api.Fragmenter({
          profile: api.createFragmentationProfile(
            name === 'css' ? 'css' : 'word',
          ),
        }).toPages({
          stacks: stackInputs.map(({ html, continuous }) => {
            const element = document.createElement('div');
            element.innerHTML = html;
            return { element, continuous };
          }),
          onPageStart: (context) => {
            starts.push(context);
            const stackInput = stackInputs[context.stackIndex];
            const size = {
              width: context.first
                ? stackInput.width
                : (stackInput.subsequentWidth ?? stackInput.width),
              height: stackInput.height,
            };
            pageSizes[context.pageIndex] = size;
            return size;
          },
          onPageRendered: ({ contentElement, pageIndex }) => {
            pages.push(
              (contentElement.textContent ?? '').replace(/\s+/g, ' ').trim(),
            );
            // Lay the page out at its own width to read what was rendered.
            const frame = document.createElement('div');
            frame.style.width = pageSizes[pageIndex].width;
            frame.style.display = 'flow-root';
            frame.appendChild(contentElement);
            document.body.appendChild(frame);
            const frameTop = frame.getBoundingClientRect().top;
            extents.push(
              Math.max(
                0,
                ...Array.from(
                  contentElement.querySelectorAll('*'),
                  (element) =>
                    element.getBoundingClientRect().bottom - frameTop,
                ),
              ),
            );
            listStarts.push(
              Array.from(
                contentElement.querySelectorAll('ol'),
                (list) => list.start,
              ),
            );
            paragraphs.push(
              Array.from(contentElement.querySelectorAll('p'), (element) => {
                const rect = element.getBoundingClientRect();
                return { top: rect.top - frameTop, height: rect.height };
              }),
            );
            probeWidths.push(
              Array.from(
                contentElement.querySelectorAll<HTMLElement>(
                  '[data-width-probe]',
                ),
                (element) => element.offsetWidth,
              ),
            );
            frame.remove();
          },
        });

        return {
          pages,
          starts,
          probeWidths,
          extents,
          listStarts,
          paragraphs,
          layout,
        };
      },
      stacks,
      profileName,
    );

  const single = (html: string) => [{ html, continuous: false, ...PAGE }];

  it('splits overflowing content across pages without losing any of it', async () => {
    const lineCount = 25;
    const { pages, starts } = await fragment(single(lines('line', lineCount)));

    expect(pages.length).toBeGreaterThan(1);
    // Every line appears exactly once, in order, across the pages.
    expect(pages.join('')).toBe(texts('line', lineCount).join(''));
    expect(starts.map(({ pageIndex }) => pageIndex)).toEqual(
      Array.from({ length: pages.length }, (_value, index) => index),
    );
  });

  it('honors break-before and break-after', async () => {
    const { pages, starts } = await fragment(
      single(
        `<p>one</p><p style="break-before:page">two</p><p style="break-after:page">three</p><p>four</p>`,
      ),
    );

    expect(pages).toEqual(['one', 'twothree', 'four']);
    // Only the first page starts the stack.
    expect(starts.map(({ first }) => first)).toEqual([true, false, false]);
  });

  it('keeps a break-inside: avoid block on a single page', async () => {
    const fillerCount = 8;
    const keptCount = 5;
    const block = (style: string) =>
      `${lines('filler', fillerCount)}<div style="${style}">${lines(
        'kept',
        keptCount,
      )}</div>`;

    // Control: the block is tall enough to straddle the page boundary.
    const split = await fragment(single(block('margin:0;')));
    expect(split.pages).toHaveLength(2);
    expect(split.pages[0]).toContain('kept0');
    expect(split.pages[1]).toContain(`kept${keptCount - 1}`);

    const avoided = await fragment(
      single(block('margin:0;break-inside:avoid;')),
    );
    expect(avoided.pages).toEqual([
      texts('filler', fillerCount).join(''),
      texts('kept', keptCount).join(''),
    ]);
  });

  it('moves a heading that keeps with the next block across a stack boundary', async () => {
    const { pages } = await fragment([
      {
        html: `${lines('a', 10)}<div style="height:40px;break-after:avoid">heading</div>`,
        continuous: false,
        ...PAGE,
      },
      { html: lines('b', 2), continuous: true, ...PAGE },
    ]);

    // Ten lines and the heading fit; the continuous stack's first line does
    // not, so the heading goes with it.
    expect(pages).toEqual([
      texts('a', 10).join(''),
      `heading${texts('b', 2).join('')}`,
    ]);
  });

  it('measures each stack at the width of the page it starts', async () => {
    const probe = '<div data-width-probe style="height:10px"></div>';
    const { probeWidths, starts } = await fragment([
      { html: probe, continuous: false, width: '6in', height: '9in' },
      { html: probe, continuous: false, width: '3in', height: '9in' },
    ]);

    expect(starts).toEqual([
      { pageIndex: 0, stackIndex: 0, first: true },
      { pageIndex: 1, stackIndex: 1, first: true },
    ]);
    expect(probeWidths).toEqual([[576], [288]]);
  });

  /** 9in at 96px to the inch, and the tolerance of the fit arithmetic. */
  const PAGE_HEIGHT_PX = 864 + 0.5;

  const words = (count: number) =>
    Array.from({ length: count }, (_value, index) => `word${index}`).join(' ');

  describe('pages of another width', () => {
    /** A stack whose first page is 6.5in wide and every other one 2.5in. */
    const narrowing = (html: string): Array<StackInput> => [
      { html, continuous: false, ...PAGE, subsequentWidth: '2.5in' },
    ];

    /** Whether every page's content ends inside its box. */
    const expectInside = (extents: ReadonlyArray<number>) => {
      for (const extent of extents) {
        expect(extent).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
      }
    };

    it('carries a paragraph on from the same word, wrapped again', async () => {
      const { pages, extents } = await fragment(
        narrowing(
          `<p style="margin:10px 0;line-height:20px;text-indent:40px;text-align:justify">${words(1200)}</p><p>after</p>`,
        ),
      );

      expect(pages.length).toBeGreaterThan(2);
      expectInside(extents);
      // The paragraph ends where the next begins, with no space between.
      expect(pages.join(' ').split(' ')).toEqual([
        ...words(1199).split(' '),
        'word1199after',
      ]);
    });

    it('carries a list item on without a second marker', async () => {
      const item = (index: number) =>
        `<li style="line-height:20px">item${index} ${words(120)}</li>`;
      const html = `<ol style="margin:0">${Array.from({ length: 12 }, (_value, index) => item(index)).join('')}</ol>`;
      const result = await harness.evaluate(async (api, listHtml: string) => {
        const element = document.createElement('div');
        element.innerHTML = listHtml;
        const pages: Array<{ starts: Array<number>; splitItems: number }> = [];
        await new api.Fragmenter().toPages({
          stacks: [{ element, continuous: false }],
          onPageStart: ({ first }) => ({
            width: first ? '6.5in' : '2.5in',
            height: '9in',
          }),
          onPageRendered: ({ contentElement }) => {
            pages.push({
              starts: Array.from(
                contentElement.querySelectorAll('ol'),
                (list) => list.start,
              ),
              splitItems: contentElement.querySelectorAll('li[data-split-from]')
                .length,
            });
          },
        });
        return pages;
      }, html);

      expect(result.length).toBeGreaterThan(2);
      // A page that opens part way through an item shows it without its
      // marker, and the list counts on from the item.
      for (const page of result.slice(1)) {
        expect(page.starts[0]).toBeGreaterThan(1);
      }
      expect(result.slice(1).some(({ splitItems }) => splitItems > 0)).toBe(
        true,
      );
    });

    it('carries a table on from the same row, and a split row from the same lines', async () => {
      const rowCount = 14;
      const rows = Array.from(
        { length: rowCount },
        (_value, row) =>
          `<tr><td style="line-height:20px">[a${row}] ${words(60)}</td><td style="line-height:20px">[b${row}]</td></tr>`,
      ).join('');
      const { pages, extents } = await fragment(
        narrowing(
          `<table style="border-collapse:collapse"><thead><tr><th>[head]</th></tr></thead><tbody>${rows}</tbody></table>`,
        ),
      );

      expect(pages.length).toBeGreaterThan(2);
      expectInside(extents);
      // Every cell once, and every word of every row once, in order, however
      // the rows were split. The header is not repeated unless asked to.
      const text = pages.join(' ');
      expect(text.match(/\[[ab]\d+\]|\[head\]/g)).toEqual([
        '[head]',
        ...Array.from({ length: rowCount }, (_value, row) => [
          `[a${row}]`,
          `[b${row}]`,
        ]).flat(),
      ]);
      expect(text.match(/word\d+/g)).toEqual(
        Array.from({ length: rowCount }, () => words(60).split(' ')).flat(),
      );
    });
  });

  it('continues the numbering of a list on the next page', async () => {
    const items = Array.from(
      { length: 15 },
      (_value, index) =>
        `<li style="height:${LINE_HEIGHT_PX}px;">item${index}</li>`,
    ).join('');
    const { pages, listStarts } = await fragment(
      single(`<ol style="margin:0">${items}</ol>`),
    );

    expect(pages).toEqual([
      texts('item', 10).join(''),
      texts('item', 15).slice(10).join(''),
    ]);
    expect(listStarts).toEqual([[1], [11]]);
  });

  it('breaks between lines of mixed sizes and inline images without cutting one', async () => {
    const mixed = Array.from(
      { length: 40 },
      (_value, index) =>
        `${words(12)} <span style="font-size:${20 + (index % 4) * 8}px">big${index}</span> <svg width="20" height="${10 + (index % 5) * 12}"></svg> <img alt="" style="width:10px;height:${index % 3 === 0 ? 50 : 5}px">`,
    ).join(' ');
    const { pages, extents } = await fragment(single(`<p>${mixed}</p>`));

    expect(pages.length).toBeGreaterThan(1);
    for (const extent of extents) {
      expect(extent).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
    }
    const all = pages.join(' ');
    for (let index = 0; index < 40; index += 1) {
      expect(all.match(new RegExp(`\\bbig${index}\\b`, 'g'))).toHaveLength(1);
    }
  });

  it('keeps pages inside their box across wrapper margins, padding and floats', async () => {
    const paragraphs = Array.from(
      { length: 12 },
      (_value, index) =>
        `<p style="margin:12px 0">${index % 4 === 0 ? '<img alt="" style="float:left;width:40px;height:120px">' : ''}para${index} ${words(60)}</p>`,
    ).join('');
    const { pages, extents } = await fragment(
      single(
        `<blockquote style="margin:30px 20px;padding:25px;border:3px solid">${paragraphs}</blockquote><p>after</p>`,
      ),
    );

    expect(pages.length).toBeGreaterThan(1);
    for (const extent of extents) {
      expect(extent).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
    }
    const all = pages.join(' ');
    for (let index = 0; index < 12; index += 1) {
      expect(all.split(`para${index} `)).toHaveLength(2);
    }
    expect(all.endsWith('after')).toBe(true);
  });

  it('places a trimmed first line where Word draws it, under the word profile only', async () => {
    const trimmed = (text: string) =>
      `<p style="margin:0 0 10px;font-size:16px;line-height:20px;text-box:trim-both cap alphabetic">${text}</p>`;
    const html = `${trimmed('one')}${trimmed('two')}`;

    const word = await fragment(single(html));
    const css = await fragment(single(html), 'css');

    const [first, second] = css.paragraphs[0];
    // A trimmed one line paragraph is as tall as its capitals.
    const capHeight = first.height;
    expect(capHeight).toBeGreaterThan(8);
    expect(capHeight).toBeLessThan(16);
    expect(first.top).toBe(0);
    expect(second.top).toBeCloseTo(capHeight + 10);
    // 0.8 L + 0.25pt − cap height, in px.
    const inset = 0.8 * 20 + 1 / 3 - capHeight;
    // Chrome lays out in 1/64px units.
    expect(word.paragraphs[0][0].top).toBeCloseTo(inset, 1);
    expect(word.paragraphs[0][1].top - word.paragraphs[0][0].top).toBeCloseTo(
      capHeight + 10,
    );
  });

  describe('masonry columns', () => {
    /** Units of that many lines, ten of which fill a column. */
    const masonry = (units: ReadonlyArray<[string, number]>) =>
      `<div ${COLUMNS_DATA_ATTRIBUTES.dataAttribute('columnFill')}="masonry" style="column-count:2;column-gap:20px">${units
        .map(([name, count]) => `<div>${lines(name, count)}</div>`)
        .join('')}</div>`;

    it('renders the units in packed order, which is the DOM order', async () => {
      const { pages, layout } = await fragment(
        single(
          masonry([
            ['a', 3],
            ['b', 5],
            ['c', 2],
            ['d', 4],
            ['e', 1],
          ]),
        ),
      );

      // Each unit goes to the column that ends highest; the columns are then
      // read top to bottom, left to right.
      expect(pages).toEqual([
        [
          ...texts('a', 3),
          ...texts('c', 2),
          ...texts('d', 4),
          ...texts('b', 5),
          ...texts('e', 1),
        ].join(''),
      ]);
      expect(layout).toEqual({
        stackCount: 1,
        masonryStacks: [{ stackIndex: 0, unitCount: 5 }],
        packedOrder: [0, 2, 3, 1, 4].map((unit, index) => ({
          stackIndex: 0,
          unit,
          pageIndex: 0,
          columnIndex: index < 3 ? 0 : 1,
        })),
      });
    });

    it('splits a unit taller than a column and reads it on across pages', async () => {
      const { pages, layout } = await fragment(
        single(
          masonry([
            ['a', 3],
            ['b', 25],
            ['c', 2],
          ]),
        ),
      );

      expect(pages).toEqual([
        [...texts('a', 3), ...texts('b', 17)].join(''),
        [...texts('b', 25).slice(17), ...texts('c', 2)].join(''),
      ]);
      expect(
        layout.packedOrder.map(
          ({ unit, pageIndex, columnIndex }) =>
            `${unit}:${pageIndex}.${columnIndex}`,
        ),
      ).toEqual(['0:0.0', '1:0.0', '1:0.1', '1:1.0', '1:1.1', '2:1.1']);
    });

    it('starts the columns below the margin of the block above them', async () => {
      const { pages, extents } = await fragment([
        {
          html: '<div style="height:80px;margin:0 0 70px">head</div>',
          continuous: false,
          ...PAGE,
        },
        {
          html: masonry(
            Array.from({ length: 20 }, (_value, index) => [`u${index}-`, 1]),
          ),
          continuous: true,
          ...PAGE,
        },
      ]);

      // 864px less the block and its margin holds eight lines per column,
      // which the units fill alternately.
      const units = (indexes: ReadonlyArray<number>) =>
        indexes.map((index) => `u${index}-0`).join('');
      const even = [0, 2, 4, 6, 8, 10, 12, 14];
      expect(pages).toEqual([
        `head${units(even)}${units(even.map((index) => index + 1))}`,
        units([16, 18, 17, 19]),
      ]);
      for (const extent of extents) {
        expect(extent).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
      }
    });

    it('starts what follows the columns below their last margins', async () => {
      const unit = (name: string) =>
        `<div style="margin:0 0 70px">${lines(name, 4)}</div>`;
      const { pages, extents } = await fragment([
        {
          html: `<div ${COLUMNS_DATA_ATTRIBUTES.dataAttribute('columnFill')}="masonry" style="column-count:2;column-gap:20px">${unit('a')}${unit('b')}</div>`,
          continuous: false,
          ...PAGE,
        },
        { html: lines('after', 6), continuous: true, ...PAGE },
      ]);

      // The columns take 320px and their 70px margins; five lines fit below.
      expect(pages).toEqual([
        [...texts('a', 4), ...texts('b', 4), ...texts('after', 5)].join(''),
        'after5',
      ]);
      for (const extent of extents) {
        expect(extent).toBeLessThanOrEqual(PAGE_HEIGHT_PX);
      }
    });
  });

  it('loads only the faces of the families the document uses', async () => {
    const statuses = await harness.evaluate(async (api) => {
      // No face has a usable file: one whose load was attempted ends up in
      // `error`, one left alone stays `unloaded`.
      const faces = ['Used Family', 'Configured', 'Host Only'].map(
        (family) => new FontFace(family, 'url(data:font/woff2;base64,AAAA)'),
      );
      faces.forEach((face) => document.fonts.add(face));
      const element = document.createElement('div');
      element.innerHTML =
        '<p style="font-family:\'Used Family\', serif">text</p>';
      try {
        await new api.Fragmenter({ fontFamilies: ['Configured'] }).toPages({
          stacks: [{ element, continuous: false }],
          onPageStart: () => ({ width: '6.5in', height: '9in' }),
        });
        return faces.map((face) => face.status);
      } finally {
        faces.forEach((face) => document.fonts.delete(face));
      }
    });

    expect(statuses).toEqual(['error', 'error', 'unloaded']);
  });

  it('ends with a blank page after a trailing forced break', async () => {
    const { pages, starts } = await fragment(
      single('<p>only</p><div style="break-after:page"></div>'),
    );

    expect(pages).toEqual(['only', '']);
    expect(starts.at(-1)).toEqual({
      pageIndex: 1,
      stackIndex: 0,
      first: false,
    });
  });
});
