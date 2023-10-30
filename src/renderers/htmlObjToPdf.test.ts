import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToHtmlObj } from 'src/renderers/reactToHtmlObj';
import { it, afterAll } from 'vitest';
import { writeTestFile } from 'src/fixtures/writeTestFile';
import { htmlObjToPdf, resetHtmlObjToPdf } from './htmlObjToPdf';

afterAll(async () => {
  // Prevents Puppeteer not closing headless Chrome instances on error.
  await resetHtmlObjToPdf();
});

it('renders without erroring', async () => {
  const htmlObj = await reactToHtmlObj(mockDocument);
  const buffer = await htmlObjToPdf(htmlObj);
  await writeTestFile('htmlObjToPdf.pdf', buffer);
});
