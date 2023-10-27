import { TypeRegistry, FormatRegistry } from '@sinclair/typebox';
import { mockDocumentElement } from 'src/mocks';
import {
  renderDocumentToDocxXml,
  renderDocumentToAst,
  renderDocumentToDocxBuffer,
  renderToPdf,
} from 'src/renderers';
import { test, afterEach } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

test('renders to ast', () => {
  const ast = renderDocumentToAst(mockDocumentElement);
  console.log(JSON.stringify(ast, null, 2));
});

// test('renders to xml', async () => {
//   console.log(await renderDocumentToDocxXml(mockDocumentElement));
// });

test('renders to docx', async () => {
  const buffer = await renderDocumentToDocxBuffer(mockDocumentElement);
  await fs.writeFile(path.resolve(dirname, '../dist-test/test.docx'), buffer);
});

test('renders to preview', async () => {
  const buffer = await renderToPdf(mockDocumentElement);
  await fs.writeFile(path.resolve(dirname, '../dist-test/test.pdf'), buffer);
});
