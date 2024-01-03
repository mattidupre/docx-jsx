import { it } from 'vitest';
import { reactToPdf } from './reactToPdf';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions';

it('runs without error', async () => {
  const buffer = await reactToPdf(<MockDocument />, {
    puppeteer: PUPPETEER_OPTIONS,
  });
  await writeTestFile('reactToPdf.pdf', buffer!);
});
