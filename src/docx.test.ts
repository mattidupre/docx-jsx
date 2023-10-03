import { mockDocumentElement } from 'src/helpers';
import {
  renderDocumentToDocxXml,
  renderDocumentToAst,
  renderDocumentToDocxBuffer,
} from 'src/renderers';
import { test } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

test('renders to ast', () => {
  console.log(
    JSON.stringify(renderDocumentToAst(mockDocumentElement), null, 2),
  );
});

test('renders to xml', async () => {
  console.log(await renderDocumentToDocxXml(mockDocumentElement));
});

test('renders to docx', async () => {
  const buffer = await renderDocumentToDocxBuffer(mockDocumentElement);
  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);
});
