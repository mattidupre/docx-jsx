import { test } from 'vitest';
import { mockDocumentHtml } from '../../fixtures/mockDocument.js';
import { htmlToTree } from './htmlToTree.js';
import { toHtml } from 'hast-util-to-html';

test('TODO', async () => {
  const tree = JSON.stringify(htmlToTree(mockDocumentHtml), undefined, 2);
  // console.log(tree);
  // console.log(JSON.stringify(tree, undefined, 2));
  // console.log(toHtml([tree as any]));
});
