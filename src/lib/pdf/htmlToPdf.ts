/* eslint-disable @typescript-eslint/consistent-type-imports */
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import type { DocumentDom } from '../dom';
import htmlToDomCodeCjs from '../dom?source';

const htmlToDomCode = `(() => {const exports={};${htmlToDomCodeCjs};return exports;})()`;

let browserPromise: undefined | Promise<Browser>;

const EMPTY_URL = 'file://empty.html';

export type HtmlToPdfOptions = {
  publicDirectory?: string;
  pageStyleSheets?: ReadonlyArray<string>;
  styleSheets?: ReadonlyArray<string>;
  puppeteer?: PuppeteerLaunchOptions;
  closeBrowser?: boolean;
};

export const htmlToPdf = async (
  html: string,
  {
    puppeteer: puppeteerOptions,
    closeBrowser,
    pageStyleSheets = [],
    publicDirectory,
    ...options
  }: HtmlToPdfOptions,
): Promise<Buffer> => {
  let pagePromise: undefined | Promise<Page> = undefined;
  try {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        ...puppeteerOptions,
        // dumpio: true,
      });
    }

    const browser = await browserPromise;
    const page = await (pagePromise = browser.newPage());

    await page.setRequestInterception(true);

    page.on('console', (msg) => console.log('Puppeteer:', msg.text()));

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
        if (existsSync(requestFilePath)) {
          return interceptedRequest.respond({
            body: await fs.readFile(requestFilePath),
          });
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

    const pageSize = await page.evaluate(
      async (browserHtml, browserOptions, browserCode) => {
        const { htmlToDom } = eval(browserCode) as typeof import('../dom');

        let documentObj = {} as DocumentDom;

        document.body.appendChild(
          await htmlToDom(browserHtml, {
            ...browserOptions,
            onDocument: (doc) => {
              documentObj = doc;
            },
          }),
        );

        return documentObj.size;
      },
      html,
      options,
      htmlToDomCode,
    );

    const result = await page.pdf({
      ...pageSize,
      printBackground: true,
      displayHeaderFooter: false,
    });

    return result;
  } finally {
    if (pagePromise) {
      const page = await pagePromise;
      await page?.close();
    }
    if (closeBrowser && browserPromise) {
      const thisBrowserPromise = browserPromise;
      browserPromise = undefined;
      const browser = await thisBrowserPromise;
      await browser?.close();
    }
  }
};
