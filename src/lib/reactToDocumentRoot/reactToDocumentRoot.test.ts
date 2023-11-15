import { it } from 'vitest';
import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToDocumentRoot } from './reactToDocumentRoot';

it('renders without erroring', async () => {
  const documentRoot = await reactToDocumentRoot(mockDocument);
  console.log(JSON.stringify(documentRoot.stacks[0].options, undefined, 2));
  // console.log(JSON.stringify(documentRoot, undefined, 2));
});
