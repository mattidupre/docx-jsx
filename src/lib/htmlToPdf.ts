import puppeteer, {
  type Browser,
  type Page,
  type PuppeteerLaunchOptions,
} from 'puppeteer-core';
import { type Headless } from '../headless.js';
import path from 'node:path';
import { type DocumentRootToDomOptions } from './htmlToDom.js';
import { createRequire } from 'node:module';

let browserPromise: null | Promise<Browser>;

// Close off Puppeteer to prevent lingering processes during dev.
export const resetHtmlObjToPdf = async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
};

export type DocumentRootToPdfOptions = DocumentRootToDomOptions &
  PuppeteerLaunchOptions;

export const htmlToPdf = async (
  html: string,
  options: DocumentRootToPdfOptions,
) => {
  // TODO: Get from htmlToDom.
  // const { size } = documentRoot;

  let FRONTEND_PATH = '';
  if (import.meta.url === undefined) {
    // Netlify transpiles back to CJS.
    // https://github.com/netlify/cli/issues/4601
    // This file is explicitly included by netlify.toml.
    // TODO: Add to options, combined with puppeteerOptions.
    // TODO: Infer from __dirname
    FRONTEND_PATH = './.yalc/matti-docs/dist/headless.js';
  } else {
    FRONTEND_PATH = path.resolve(
      path.dirname(
        createRequire(import.meta.url).resolve('matti-docs/package.json'),
      ),
      './dist/headless.js',
    );
  }

  const puppeteerOptions = { ...options };

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
    await page.addScriptTag({ path: FRONTEND_PATH });
    await page.evaluate(async (browserHtml) => {
      const headless = (window as any).headless as Headless;
      if (!headless) {
        throw new Error('Headless script not injected into browser.');
      }
      document.body.appendChild(await headless.htmlToDom(browserHtml));
    }, html);

    return await page.pdf({
      // ...size,
      printBackground: true,
      displayHeaderFooter: false,
    });
  } finally {
    page?.close();
  }
};
