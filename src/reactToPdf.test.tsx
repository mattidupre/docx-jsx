import fs from 'node:fs/promises';
import { it } from 'vitest';
import { reactToPdf } from './reactToPdf.js';
import { MockDocument } from './fixtures/mockDocument.js';
import { writeTestFile } from './fixtures/writeTestFile.js';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions.js';

const mockStyleSheets = await Promise.all(
  ['./fixtures/mockPages.css'].map((relativePath) =>
    fs.readFile(require.resolve(relativePath), {
      encoding: 'utf8',
    }),
  ),
);

it('runs without error', async () => {
  const buffer = await reactToPdf(<MockDocument />, {
    puppeteer: PUPPETEER_OPTIONS,
    styleSheets: mockStyleSheets,
  });
  await writeTestFile('reactToPdf.pdf', buffer);
});