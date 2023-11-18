import { type ReactElement } from 'react';
import { reactToTree } from './reactToTree.js';
import { treeToDocumentRoot } from './treeToDocumentRoot.js';

export const reactToDocumentRoot = async (rootElement: ReactElement) => {
  const tree = await reactToTree(rootElement);
  const documentRoot = treeToDocumentRoot(tree);
  return documentRoot;
};
