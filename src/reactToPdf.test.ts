import { it } from 'vitest';
import { reactToPdf } from './reactToPdf.js';
import { mockDocument } from 'src/fixtures/mockDocument.js';
import { writeTestFile } from 'src/fixtures/writeTestFile.js';
import { PUPPETEER_OPTIONS } from 'src/fixtures/puppeteerOptions.js';

it('runs without error', async () => {
  const buffer = await reactToPdf(mockDocument, PUPPETEER_OPTIONS);
  await writeTestFile('reactToPdf.pdf', buffer);
});
