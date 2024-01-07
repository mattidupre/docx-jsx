import { it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import { MockDocument } from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { mockFonts } from './fixtures/mockFonts';

it('runs without error', async () => {
  const buffer = await reactToDocx(<MockDocument />, { fonts: mockFonts });
  await writeTestFile('reactToDocx.docx', buffer);
});
