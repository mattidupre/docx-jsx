import { it } from 'vitest';
import fs from 'node:fs/promises';
import { reactToPdf } from './reactToPdf.js';
import { mockDocument } from './fixtures/mockDocument.js';
import { writeTestFile } from './fixtures/writeTestFile.js';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions.js';

const mockStyleSheet = await fs.readFile(
  require.resolve('./fixtures/mockPages.css'),
  {
    encoding: 'utf8',
  },
);

it('runs without error', async () => {
  const buffer = await reactToPdf(mockDocument, {
    puppeteer: PUPPETEER_OPTIONS,
    styleSheets: [mockStyleSheet],
  });
  await writeTestFile('reactToPdf.pdf', buffer);
});
