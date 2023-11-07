import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToTree } from './reactToTree';
import { it } from 'vitest';

it('renders without erroring', async () => {
  const hast = await reactToTree(mockDocument);
  console.log(hast);
});
