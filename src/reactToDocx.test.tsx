import { it } from 'vitest';
import { reactToDocx } from './reactToDocx.js';
import { MockDocument } from './fixtures/mockDocument.js';
import { writeTestFile } from './fixtures/writeTestFile.js';

it('runs without error', async () => {
  const buffer = await reactToDocx(<MockDocument />);
  await writeTestFile('reactToDocx.docx', buffer);
});
