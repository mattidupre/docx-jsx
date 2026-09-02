import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { closeTestBrowser, launchTestBrowser } from '../fixtures/browser';
import {
  createBrowserHarness,
  type BrowserHarness,
} from '../fixtures/browserHarness';
import type * as pagerModule from './pager';

const RESOLVE_DIR = path.dirname(fileURLToPath(import.meta.url));

type PagerApi = typeof pagerModule;

type PagedResult = {
  pages: Array<string>;
  breaks: Array<{ pageIndex: number; text: string }>;
  startedPageIndexes: Array<number>;
};

/**
 * A default page is 11in tall with 1in margins, so its content area holds ten
 * of these lines and a little more. Fixed heights keep the tests independent
 * of the font Chrome happens to use.
 */
const LINE_HEIGHT_PX = 80;

const lines = (prefix: string, count: number) =>
  Array.from(
    { length: count },
    (_value, index) =>
      `<div style="margin:0;height:${LINE_HEIGHT_PX}px;">${prefix}${index}</div>`,
  ).join('');

const texts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_value, index) => `${prefix}${index}`);

describe('Pager', () => {
  let browser: Browser;
  let harness: BrowserHarness<PagerApi>;

  beforeAll(async () => {
    browser = await launchTestBrowser();
    harness = await createBrowserHarness<PagerApi>(browser, {
      modules: ['./pager'],
      resolveDir: RESOLVE_DIR,
    });
  });

  afterAll(async () => {
    await harness?.close();
    await closeTestBrowser(browser);
  });

  const paginate = (contentHtml: string) =>
    harness.evaluate(async (api, html: string): Promise<PagedResult> => {
      // pagedjs only tags the children of the content root, so the root has to
      // be a fragment, exactly as `stacksToFragment` produces.
      const templateEl = document.createElement('template');
      templateEl.innerHTML = html;

      const pages: Array<string> = [];
      const breaks: Array<{ pageIndex: number; text: string }> = [];
      const startedPageIndexes: Array<number> = [];

      await new api.Pager().toPages({
        content: templateEl.content,
        onPageStart: ({ pageIndex }) => {
          startedPageIndexes.push(pageIndex);
        },
        onPageBreak: ({ breakElement, pageIndex }) => {
          breaks.push({
            pageIndex,
            text: (breakElement.textContent ?? '').trim(),
          });
        },
        onPageRendered: ({ contentElement }) => {
          pages.push(
            (contentElement.textContent ?? '').replace(/\s+/g, ' ').trim(),
          );
        },
      });

      return { pages, breaks, startedPageIndexes };
    }, contentHtml);

  it('splits overflowing content across pages without losing any of it', async () => {
    const lineCount = 25;
    const { pages, startedPageIndexes } = await paginate(
      lines('line', lineCount),
    );

    expect(pages.length).toBeGreaterThan(1);
    // Every line appears exactly once, in order, across the pages.
    expect(pages.join('')).toBe(texts('line', lineCount).join(''));
    expect(startedPageIndexes).toEqual(
      Array.from({ length: pages.length }, (_value, index) => index),
    );
  });

  it('honors break-before and reports the page each break ends', async () => {
    const { pages, breaks } = await paginate(
      `<p>one</p><p data-break-before="page">two</p><p data-break-before="page">three</p>`,
    );

    expect(pages).toEqual(['one', 'two', 'three']);
    // A break token belongs to the page it interrupted, not to the first one.
    expect(breaks).toEqual([
      { pageIndex: 0, text: 'two' },
      { pageIndex: 1, text: 'three' },
    ]);
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
    const split = await paginate(block('margin:0;'));
    expect(split.pages).toHaveLength(2);
    expect(split.pages[0]).toContain('kept0');
    expect(split.pages[1]).toContain(`kept${keptCount - 1}`);

    const avoided = await paginate(block('margin:0;break-inside:avoid;'));
    expect(avoided.pages).toEqual([
      texts('filler', fillerCount).join(''),
      texts('kept', keptCount).join(''),
    ]);
  });
});
