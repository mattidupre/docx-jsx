import { it } from 'vitest';
import { reactToPdf } from './reactToPdf.js';
import { mockDocument } from './fixtures/mockDocument.js';
import { writeTestFile } from './fixtures/writeTestFile.js';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions.js';
// @ts-ignore
import mockStyleSheet from './fixtures/mockPages.css?inline';

it('runs without error', async () => {
  const buffer = await reactToPdf(mockDocument, {
    ...PUPPETEER_OPTIONS,
    styleSheets: [mockStyleSheet],
  });
  await writeTestFile('reactToPdf.pdf', buffer);
});
