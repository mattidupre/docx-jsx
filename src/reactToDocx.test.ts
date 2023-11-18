import { it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import { mockDocument } from 'src/fixtures/mockDocument';
import { writeTestFile } from 'src/fixtures/writeTestFile';

it('runs without error', async () => {
  const buffer = await reactToDocx(mockDocument, {});
  await writeTestFile('reactToDocx.docx', buffer);
});
