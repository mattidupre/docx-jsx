import { mockDocument } from 'src/fixtures/mockDocument';
import { writeTestFile } from 'src/fixtures/writeTestFile';
import { reactToDocx } from './reactToDocx';
import { it } from 'vitest';
import { Packer } from 'docx';

it('renders without erroring', async () => {
  const docx = await reactToDocx(mockDocument);
  const buffer = await Packer.toBuffer(docx);
  await writeTestFile('reactToDocx.docx', buffer);
});
