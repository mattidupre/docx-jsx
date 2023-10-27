import { htmlRenderer } from 'src/entities';
import { reactParser } from 'src/lib/reactParser';
import { createRenderer } from 'src/lib/createRenderer';
import { type ReactNode } from 'react';
import puppeteer, { type Browser } from 'puppeteer';
import { type Headless } from 'src/headless';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const renderToHtml = createRenderer({
  parser: reactParser,
  renderer: htmlRenderer,
});

let browserPromise: Promise<Browser>;
const instantiatePage = async () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ dumpio: true, headless: 'new' });
  }
  const browser = await browserPromise;
  const page = await browser.newPage();
  page.on('console', (msg) => console[msg.type()]('PAGE LOG:', msg.text()));
  return page;
};

let frontendPromise: Promise<string>;
const loadFrontend = async () => {
  if (!frontendPromise) {
    frontendPromise = fs.readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../dist-headless/headless.js',
      ),
      { encoding: 'utf8' },
    );
  }
  return await frontendPromise;
};

export const renderToPdf = async (node: ReactNode) => {
  // const puppeteerInitStartTime = performance.now();

  const [puppeteerPage, headlessFrontend] = await Promise.all([
    instantiatePage(),
    loadFrontend(),
  ]);

  await puppeteerPage.addScriptTag({ content: headlessFrontend });

  // console.log(
  //   `Puppeteer instantiated in ${Math.round(
  //     performance.now() - puppeteerInitStartTime,
  //   )}ms.`,
  // );

  const htmlStartTime = performance.now();

  const html = renderToHtml(node);

  // console.log(
  //   `HTML created in ${Math.round(performance.now() - htmlStartTime)}ms.`,
  // );

  await puppeteerPage.evaluate(async (html) => {
    const headless = (window as any).headless as Headless;
    if (!headless) {
      throw new Error('Headless script not injected into browser.');
    }

    const pagerStartTime = performance.now();

    await headless.renderPages(html);

    console.log(
      `Pager run in ${Math.round(performance.now() - pagerStartTime)}ms.`,
    );
  }, html as any);

  // const pdfStartTime = performance.now();

  const rawPdf = await puppeteerPage.pdf({
    format: 'letter',
    printBackground: true,
    displayHeaderFooter: false,
  });

  // console.log(
  //   `PDF created in ${Math.round(performance.now() - pdfStartTime)}ms.`,
  // );

  return rawPdf;
};
