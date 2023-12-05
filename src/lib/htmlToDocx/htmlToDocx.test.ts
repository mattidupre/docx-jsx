import { test } from 'vitest';
import { mockDocumentHtml } from '../../fixtures/mockDocument.js';
import { htmlToDocx } from './htmlToDocx.js';
import { Packer } from 'docx';
import { writeTestFile } from 'src/fixtures/writeTestFile';

test('TODO', async () => {
  const docx = htmlToDocx(mockDocumentHtml);
  const buffer = await Packer.toBuffer(docx);
  writeTestFile('new2.docx', buffer);
});
