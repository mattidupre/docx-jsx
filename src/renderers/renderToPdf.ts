import { type Browser, type Page } from 'puppeteer';
import { type Headless } from 'src/headless';
import path from 'path';
import { fileURLToPath } from 'url';
import { type DocumentOptions } from 'src/entities';

const FRONTEND_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist-headless/headless.js',
);

export const renderToPdf = async (
  browser: Browser,
  documentOptions: DocumentOptions,
) => {
  let page: undefined | Page = undefined;
  try {
    page = await browser.newPage();

    page.on('console', (msg) => console[msg.type()]('Puppeteer:', msg.text()));
    await page.addScriptTag({ path: FRONTEND_PATH });

    await page.evaluate(async (document) => {
      const headless = (window as any).headless as Headless;
      if (!headless) {
        throw new Error('Headless script not injected into browser.');
      }

      const pagerStartTime = performance.now();

      await headless.renderPages(document);

      console.log(
        `Headless script run in ${Math.round(
          performance.now() - pagerStartTime,
        )}ms.`,
      );
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
