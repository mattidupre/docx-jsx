import { it } from 'vitest';
import { reactToPdf } from './reactToPdf.js';
import { mockDocument } from './fixtures/mockDocument.js';
import { writeTestFile } from './fixtures/writeTestFile.js';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions.js';

it('runs without error', async () => {
  const buffer = await reactToPdf(mockDocument, PUPPETEER_OPTIONS);
  await writeTestFile('reactToPdf.pdf', buffer);
});
