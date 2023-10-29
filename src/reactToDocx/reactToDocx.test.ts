import { mockDoc } from 'src/mocks';
import { reactToDocx } from './reactToDocx';
import { it } from 'vitest';
import { MOCK_DIST_PATH } from 'src/mocks';
import { Packer } from 'docx';
import fs from 'node:fs/promises';
import path from 'path';

it('renders', async () => {
  const docx = await reactToDocx(mockDoc);
  const buffer = await Packer.toBuffer(docx);
  await fs.writeFile(path.join(MOCK_DIST_PATH, 'test-docx.docx'), buffer);
});
