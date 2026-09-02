import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Browser, Page } from 'puppeteer-core';
import type { FontsConfig } from '../../entities';
import type { DocumentDom } from '../dom';
import { htmlToScript } from '../script';
import type { ErrorObject } from '../../utils';

const EMPTY_URL = 'file://empty.html';

export type HtmlToPdfOptions = {
  publicDirectory?: string;
  pageStyleSheets?: ReadonlyArray<string>;
  styleSheets?: ReadonlyArray<string>;
  fonts?: FontsConfig;
  browser: Browser;
  closeBrowser?: boolean;
};

export const htmlToPdf = async (
  html: string,
  {
    browser,
    closeBrowser,
    pageStyleSheets = [],
    publicDirectory,
    ...options
  }: HtmlToPdfOptions,
): Promise<ErrorObject | Uint8Array<ArrayBufferLike>> => {
  let pagePromise: undefined | Promise<Page> = undefined;
  try {
    const script = htmlToScript(html, options);

    const page = await (pagePromise = browser.newPage());

    await page.setRequestInterception(true);

    page.on('console', (msg) => console.info('Puppeteer:', msg.text()));

    page.on('request', async (interceptedRequest) => {
      const relativePath = interceptedRequest.url().replace(EMPTY_URL, '');
      if (relativePath === '/') {
        return interceptedRequest.respond({
          contentType: 'text/html',
          body: '<html><head></head><body></body></html>',
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

    const documentObj = (await page.evaluate(script)) as DocumentDom;

    const result = await page.pdf({
      ...documentObj.size,
      printBackground: true,
      displayHeaderFooter: false,
    });

    return result;
  } catch (error) {
    return { error };
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
    if (closeBrowser) {
      try {
        await browser?.close();
      } catch (error) {
        console.error('Cannot close browser', error);
      }
    }
  }
};
