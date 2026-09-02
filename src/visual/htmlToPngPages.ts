import type { Browser } from 'puppeteer-core';
import {
  type HtmlInput,
  type PngPage,
  readHtmlInput,
  toPngPage,
  withTimeout,
} from './entities';

/**
 * Strip the preview chrome `reactToHtmlDocument` adds so HTML pages are
 * directly comparable with the PDF and DOCX rasters.
 */
const CAPTURE_CSS = `
  .page {
    box-shadow: none !important;
    margin: 0 !important;
    background: #fff !important;
  }
  html, body { background: #fff !important; margin: 0 !important; }
  * { -webkit-font-smoothing: antialiased; }
`;

const SETTLE_SAMPLES = 2;

const SETTLE_INTERVAL_MS = 200;

const DEFAULT_TIMEOUT = 60_000;

export type HtmlToPngPagesOptions = {
  readonly browser: Browser;
  readonly containerSelector?: string;
  readonly selector?: string;
  readonly deviceScaleFactor?: number;
  readonly timeout?: number;
};

/**
 * Screenshot every paginated page element of a generated HTML document.
 *
 * The document paginates itself with an inline script, so the renderer waits
 * for the page elements to settle rather than for a network event.
 *
 * The query is scoped to the destination container on purpose: `htmlToDom`
 * paginates inside a hidden element appended to `document.body`, and those
 * in-flight `PageTemplate`s carry the same page class. An unscoped
 * `querySelectorAll` races the chunker and returns a partial page count.
 *
 * Polling happens in Node rather than through `page.waitForFunction`: an
 * in-page requestAnimationFrame poller competes with the chunker's own
 * requestAnimationFrame work and has been observed to crash the renderer.
 */
export const htmlToPngPages = (
  html: HtmlInput,
  options: HtmlToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> =>
  // The settle loop has its own deadline; this outer one also covers the
  // screenshot pass, which can wedge on a tab that never paints.
  withTimeout('htmlToPngPages', (options.timeout ?? DEFAULT_TIMEOUT) * 2, () =>
    renderHtmlPages(html, options),
  );

const renderHtmlPages = async (
  html: HtmlInput,
  {
    browser,
    containerSelector = '#rendered',
    selector = '.page',
    deviceScaleFactor = 1,
    timeout = DEFAULT_TIMEOUT,
  }: HtmlToPngPagesOptions,
): Promise<ReadonlyArray<PngPage>> => {
  const scopedSelector = `${containerSelector} ${selector}`;
  const markup = await readHtmlInput(html);
  const page = await browser.newPage();
  /** In-page exceptions are the usual cause of a stalled paginator. */
  const pageErrors: Array<string> = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  const describePageErrors = () =>
    pageErrors.length > 0
      ? ` In-page errors: ${[...new Set(pageErrors)].join(' | ')}`
      : '';
  try {
    await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor });
    // pagedjs drives pagination from timers; a backgrounded tab is throttled
    // and pagination stalls indefinitely.
    await page.bringToFront();
    await page.setContent(markup, { waitUntil: 'domcontentloaded', timeout });

    const deadline = Date.now() + timeout;
    let previousCount = -1;
    let stableSamples = 0;
    for (;;) {
      const count = await page
        .evaluate(
          (query: string) => document.querySelectorAll(query).length,
          scopedSelector,
        )
        .catch((error: unknown) => {
          throw new Error(
            `htmlToPngPages: the page died while paginating (${
              error instanceof Error ? error.message : String(error)
            }).${describePageErrors()}`,
          );
        });
      stableSamples = count > 0 && count === previousCount ? stableSamples + 1 : 0;
      previousCount = count;
      if (stableSamples >= SETTLE_SAMPLES) {
        break;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `htmlToPngPages: "${scopedSelector}" never settled (last count ${count}).${
            describePageErrors() || ' No in-page errors were reported.'
          }`,
        );
      }
      await new Promise((resolve) => {
        setTimeout(resolve, SETTLE_INTERVAL_MS);
      });
    }

    await page.addStyleTag({ content: CAPTURE_CSS });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const handles = await page.$$(scopedSelector);
    const pages: Array<PngPage> = [];
    for (const [index, handle] of handles.entries()) {
      const buffer = await handle.screenshot({
        type: 'png',
        captureBeyondViewport: true,
      });
      pages.push(toPngPage(Buffer.from(buffer), index));
    }
    return pages;
  } finally {
    await page.close().catch(() => undefined);
  }
};
