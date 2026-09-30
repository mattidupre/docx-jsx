import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../fixtures/browserHarness';
import type { UnitsSize } from '../entities';
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
        const pageSizes: Array<{ width: UnitsSize; height: UnitsSize }> = [];

        await new api.Fragmenter({
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
            const { width, height } = stackInputs[context.stackIndex];
            pageSizes[context.pageIndex] = { width, height };
            return { width, height };
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

        return { pages, starts, probeWidths, extents, listStarts };
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
