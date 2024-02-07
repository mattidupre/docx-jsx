import { beforeAll, test } from 'vitest';
import { reactToPdf } from './reactToPdf';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { PUPPETEER_OPTIONS } from './fixtures/puppeteerOptions';

beforeAll(async () => {
  console.log('TODO: Create CSS');
  await writeTestFile('reactToPdf.css', '* { fontStyle: italic !important; }'!);
});

test('with shadow dom', async () => {
  const buffer = await reactToPdf(<MockDocument />, {
    puppeteer: PUPPETEER_OPTIONS,
    shadow: true,
    styleSheets: [],
  });
  await writeTestFile('reactToPdfShadowDom.pdf', buffer!);
});

test('without shadow dom', async () => {
  const buffer = await reactToPdf(<MockDocument />, {
    puppeteer: PUPPETEER_OPTIONS,
    shadow: false,
    styleSheetPaths: [],
  });
  await writeTestFile('reactToPdf.pdf', buffer!);
});
