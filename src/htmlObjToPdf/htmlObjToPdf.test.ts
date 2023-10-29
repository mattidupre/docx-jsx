import { mockDoc } from 'src/mocks';
import { reactToHtmlObj } from 'src/reactToHtmlObj/reactToHtmlObj';
import { it, afterAll } from 'vitest';
import { MOCK_DIST_PATH } from 'src/mocks';
import { Packer } from 'docx';
import fs from 'node:fs/promises';
import path from 'path';
import { htmlObjToPdf, resetHtmlObjToPdf } from './htmlObjToPdf';

afterAll(async () => {
  await resetHtmlObjToPdf();
});

it('renders', async () => {
  const htmlObj = await reactToHtmlObj(mockDoc);
  const buffer = await htmlObjToPdf(htmlObj);
  await fs.writeFile(path.join(MOCK_DIST_PATH, 'test-pdf.pdf'), buffer);
});
