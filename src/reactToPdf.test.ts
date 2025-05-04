import path from 'path';
import { test } from 'vitest';
import puppeteer from 'puppeteer-core';
import { reactToPdf } from './reactToPdf';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions';

const fontPath = require.resolve('./fixtures/mockAssets/Pacifico.ttf');

const browser = await puppeteer.launch(PUPPETEER_OPTIONS);

test('creates a pdf file', async () => {
  await writeTestFile(
    'reactToPdf.pdf',
    await reactToPdf(MockDocument, {
      browser,
      publicDirectory: path.dirname(fontPath),
    }),
  );
});

test('supports custom fonts', async () => {
  // Pacifico is a larger font. Ensure all pages are in boundsl
  await writeTestFile(
    'reactToPdf-pacifico.pdf',
    await reactToPdf(MockDocument, {
      browser,
      publicDirectory: path.dirname(fontPath),
      pageStyleSheets: [
        `
        @font-face {
          font-family: "Mock";
          src: url("/${path.basename(fontPath)}") format("truetype");
        }
        `,
      ],
      styleSheets: [
        `
        :host {
          font-family: Mock;
        }
        `,
      ],
    }),
  );
});
