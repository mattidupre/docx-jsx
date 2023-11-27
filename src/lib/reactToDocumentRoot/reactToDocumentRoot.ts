import { type ReactElement } from 'react';
import { createRenderer } from './reactToTree.js';
import { treeToDocumentRoot } from './treeToDocumentRoot.js';

const reactToTree = createRenderer();

export const reactToDocumentRoot = async (rootElement: ReactElement) => {
  const tree = await reactToTree(rootElement);
  const documentRoot = treeToDocumentRoot(tree);
  return documentRoot;
};
