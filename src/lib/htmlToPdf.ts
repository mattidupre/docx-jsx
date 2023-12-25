import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import type { Headless } from '../headless';
import { HEADLESS_PATH } from '../entities';
import type { DocumentDom } from './htmlToDom';

let browserPromise: null | Promise<Browser>;

const resolve = import.meta?.url
  ? createRequire(import.meta.url).resolve
  : require.resolve;

const ROOT_DIR = path.dirname(resolve('matti-docs/package.json'));

// Close off Puppeteer to prevent lingering processes during dev.
export const resetHtmlToPdf = async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
};

export type HtmlToPdfOptions = {
  moduleDirectory?: string;
  styleSheets?: ReadonlyArray<string>;
  puppeteer?: PuppeteerLaunchOptions;
};

export const htmlToPdf = async (
  html: string,
  {
    puppeteer: puppeteerOptions,
    moduleDirectory,
    ...options
  }: HtmlToPdfOptions,
) => {
  const headlessPath = path.join(moduleDirectory ?? ROOT_DIR, HEADLESS_PATH);

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
    page.on('console', (msg) => console.log('Puppeteer:', msg.text()));
    await page.addScriptTag({ path: headlessPath });
    const pageSize = await page.evaluate(
      async (browserHtml, browserOptions) => {
        const headless = (window as any).headless as Headless;
        if (!headless) {
          throw new Error('Headless script not injected into browser.');
        }

        let documentObj = {} as DocumentDom;

        document.body.appendChild(
          await headless.htmlToDom(browserHtml, {
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
