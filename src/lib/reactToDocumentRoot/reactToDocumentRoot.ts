import { type ReactElement } from 'react';
import { reactToTree } from './reactToTree';
import { treeToDocumentRoot } from './treeToDocumentRoot';

export const reactToDocumentRoot = async (rootElement: ReactElement) => {
  const tree = await reactToTree(rootElement);
  const documentRoot = treeToDocumentRoot(tree);
  return documentRoot;
};
