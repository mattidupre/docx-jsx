import { treeToDom, type DocumentRootToDomOptions } from './lib/treeToDom.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToTree } from './lib/htmlToTree.js';

import { ReactElement } from 'react';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => {
  const html = renderToStaticMarkup(rootElement);
  const tree = htmlToTree(html);
  return treeToDom(tree, options);
};
