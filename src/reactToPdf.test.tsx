import { fileURLToPath } from 'url';
import path from 'path';
import { it } from 'vitest';
import { reactToPdf } from './reactToPdf';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions';

const fontPath = require.resolve('./fixtures/mockAssets/Pacifico.ttf');

it('runs without error', async () => {
  const buffer = await reactToPdf(<MockDocument />, {
    puppeteer: PUPPETEER_OPTIONS,
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
      .page__content {
        font-family: Mock;
      }
      `,
    ],
  });
  await writeTestFile('reactToPdf.pdf', buffer!);
});
