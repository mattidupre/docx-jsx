/* eslint-disable @typescript-eslint/consistent-type-imports */
import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import type { DocumentDom } from '../dom';
import htmlToDomCodeCjs from '../dom?source';

const htmlToDomCode = `(() => {const exports={};${htmlToDomCodeCjs};return exports;})()`;

let browserPromise: undefined | Promise<Browser>;

export type HtmlToPdfOptions = {
  puppeteer?: PuppeteerLaunchOptions;
  closeBrowser?: boolean;
} & (
  | {
      shadow: true;
      styleSheets: ReadonlyArray<string>;
      styleSheetPaths?: undefined;
    }
  | {
      shadow?: false;
      styleSheets?: undefined;
      styleSheetPaths: ReadonlyArray<string>;
    }
);

export const htmlToPdf = async (
  html: string,
  { puppeteer: puppeteerOptions, closeBrowser, ...options }: HtmlToPdfOptions,
): Promise<Buffer> => {
  let pagePromise: undefined | Promise<Page> = undefined;
  try {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        ...puppeteerOptions,
        dumpio: true,
      });
    }

    const browser = await browserPromise;
    const page = await (pagePromise = browser.newPage());

    await page.setRequestInterception(true);

    page.on('console', (msg) => console.log('Puppeteer:', msg.text()));

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
