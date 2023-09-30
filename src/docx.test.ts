import { mockDocumentElement } from 'src/helpers';
import { renderDocumentToDocXBuffer } from 'src';
import { test } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

test('todo', async () => {
  const buffer = await renderDocumentToDocXBuffer(mockDocumentElement);
  await fs.writeFile(path.resolve(dirname, '../dist/test.docx'), buffer);
});
