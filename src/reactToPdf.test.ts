import { it } from 'vitest';
import { reactToPdf } from './reactToPdf';
import { mockDocument } from 'src/fixtures/mockDocument';
import { writeTestFile } from 'src/fixtures/writeTestFile';
import { PUPPETEER_OPTIONS } from 'src/fixtures/puppeteerOptions';

it('runs without error', async () => {
  const buffer = await reactToPdf(mockDocument, PUPPETEER_OPTIONS);
  await writeTestFile('reactToPdf.pdf', buffer);
});
