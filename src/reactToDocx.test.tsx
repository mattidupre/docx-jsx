import { it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';

it('runs without error', async () => {
  const buffer = await reactToDocx(<MockDocument />);
  await writeTestFile('reactToDocx.docx', buffer);
});
