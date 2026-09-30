import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Browser, Page } from 'puppeteer-core';
import type { FontsConfig } from '../../entities';
import { resolveDocumentFonts } from '../../lib/documentFonts';
import { htmlToScript, type ScriptResult } from '../script';

const EMPTY_URL = 'file://empty.html';

/**
 * Chrome gives `body` an 8px margin, print media included. It would make the
 * document 16px wider than the page, and Chrome then shrinks every PDF page to
 * fit and shifts it.
 */
const EMPTY_DOCUMENT = `<html><head><style>html, body { margin: 0; padding: 0; }</style></head><body></body></html>`;

export type BrowserRenderOptions = {
  publicDirectory?: string;
  pageStyleSheets?: ReadonlyArray<string>;
  styleSheets?: ReadonlyArray<string>;
  fonts?: FontsConfig;
  browser: Browser;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isScriptResult = (value: unknown): value is ScriptResult =>
  isRecord(value) && isRecord(value['size']) && isRecord(value['layout']);

/**
 * Renders `html` in a new page of `browser`, paginated by the DOM pipeline as
 * every browser target is, and hands the page and what the pipeline resolved
 * to `withPage`. The page is closed afterwards; the browser is left open.
 */
export const renderInBrowser = async <TResult>(
  html: string,
  {
    browser,
    pageStyleSheets = [],
    publicDirectory,
    fonts,
    ...options
  }: BrowserRenderOptions,
  withPage: (page: Page, result: ScriptResult) => Promise<TResult>,
): Promise<TResult> => {
  let pagePromise: undefined | Promise<Page> = undefined;
  try {
    // The page cannot read the font files for their metrics, so they are read
    // here, from the same public directory the page is served.
    const script = htmlToScript(html, {
      ...options,
      fonts: await resolveDocumentFonts(html, { fonts, publicDirectory }),
    });

    const page = await (pagePromise = browser.newPage());

    await page.setRequestInterception(true);

    page.on('console', (msg) => console.info('Puppeteer:', msg.text()));

    page.on('request', async (interceptedRequest) => {
      const relativePath = interceptedRequest.url().replace(EMPTY_URL, '');
      if (relativePath === '/') {
        return interceptedRequest.respond({
          contentType: 'text/html',
          body: EMPTY_DOCUMENT,
        });
      }
      if (publicDirectory) {
        const requestFilePath = path.join(publicDirectory, relativePath);
        // Read before responding: a request that is neither responded to nor
        // continued leaves the page waiting until it times out.
        const body = existsSync(requestFilePath)
          ? await fs.readFile(requestFilePath).catch((error: unknown) => {
              console.error(`Cannot read ${requestFilePath}`, error);
              return undefined;
            })
          : undefined;
        if (body) {
          return interceptedRequest.respond({ body });
        }
      }
      interceptedRequest.continue();
    });
    // https://github.com/puppeteer/puppeteer/issues/4526
    await page.goto(EMPTY_URL);

    // Add page stylesheet to load fonts.
    await Promise.all(
      pageStyleSheets.map((styleSheet) => {
        return page.addStyleTag({ content: styleSheet });
      }),
    );

    const result: unknown = await page.evaluate(script);
    if (!isScriptResult(result)) {
      throw new Error('The document could not be laid out in the browser.');
    }

    return await withPage(page, result);
  } finally {
    // `pagePromise` rejects when the page could never be opened; awaiting it
    // outside this try would throw out of the finally block and leak the
    // browser along with the original error.
    try {
      const page = await pagePromise;
      await page?.close();
    } catch (error) {
      console.error('Cannot close page', error);
    }
  }
};
