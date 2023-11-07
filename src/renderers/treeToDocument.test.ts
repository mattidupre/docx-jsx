import { reactToTree } from 'src/utils';
import { treeToDocument } from './treeToDocument';
import { mockDocument } from 'src/fixtures/mockDocument';
import { test } from 'vitest';

test('todo', async () => {
  const tree = await reactToTree(mockDocument);
  const document = treeToDocument(tree);
  console.log(document);
});
