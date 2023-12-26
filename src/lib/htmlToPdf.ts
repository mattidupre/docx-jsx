/* eslint-disable @typescript-eslint/consistent-type-imports */
import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import type { DocumentDom } from './htmlToDom';
import htmlToDomCodeCjs from './htmlToDom?source';

const htmlToDomCode = `(() => {const exports={};${htmlToDomCodeCjs};return exports;})()`;

let browserPromise: null | Promise<Browser>;

// Close off Puppeteer to prevent lingering processes during dev.
export const resetHtmlToPdf = async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
};

export type HtmlToPdfOptions = {
  styleSheets?: ReadonlyArray<string>;
  puppeteer?: PuppeteerLaunchOptions;
};

export const htmlToPdf = async (
  html: string,
  { puppeteer: puppeteerOptions, ...options }: HtmlToPdfOptions,
) => {
  let page: undefined | Page = undefined;
  try {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        ...puppeteerOptions,
        dumpio: true,
      });
    }

    const browser = await browserPromise;
    page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('console', (msg) => console.log('Puppeteer:', msg.text()));

    const pageSize = await page.evaluate(
      async (browserHtml, browserOptions, browserCode) => {
        const { htmlToDom } = eval(browserCode) as typeof import('./htmlToDom');

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

    return await page.pdf({
      ...pageSize,
      printBackground: true,
      displayHeaderFooter: false,
    });
  } finally {
    page?.close();
  }
};
