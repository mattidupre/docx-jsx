import { it } from 'vitest';
import { reactToDocx } from './reactToDocx.js';
import { mockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';

it('runs without error', async () => {
  const buffer = await reactToDocx(mockDocument, {});
  await writeTestFile('reactToDocx.docx', buffer);
});
