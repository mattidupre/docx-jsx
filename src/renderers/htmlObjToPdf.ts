import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import { type Headless } from 'src/headless';
import { type DocumentOptions } from 'src/entities';
import { createRequire } from 'node:module';

let browserPromise: null | Promise<Browser>;

export const resetHtmlObjToPdf = async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
};

export const htmlObjToPdf = async (
  documentOptions: DocumentOptions,
  puppeteerOptions: PuppeteerLaunchOptions,
) => {
  let FRONTEND_PATH = '';
  if (import.meta.url === undefined) {
    // Netlify transpiles back to CJS.
    // https://github.com/netlify/cli/issues/4601
    // This file is explicitly included by netlify.toml.
    FRONTEND_PATH = './.yalc/matti-docs/dist/headless.js';
  } else {
    FRONTEND_PATH = createRequire(import.meta.url).resolve(
      'matti-docs/headless',
    );
  }

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
    page.on('console', (msg) => console[msg.type()]('Puppeteer:', msg.text()));
    await page.addScriptTag({ path: FRONTEND_PATH });
    await page.evaluate(async (document) => {
      const headless = (window as any).headless as Headless;
      if (!headless) {
        throw new Error('Headless script not injected into browser.');
      }
      await headless.renderPages(document);
    }, documentOptions);
    return await page.pdf({
      format: 'letter', // TODO: Get this from config.
      printBackground: true,
      displayHeaderFooter: false,
    });
  } finally {
    page?.close();
  }
};
