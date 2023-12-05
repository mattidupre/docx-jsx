import {
  documentRootToDom,
  type DocumentRootToDomOptions,
} from './lib/treeToDom/index.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToTree } from './lib/htmlToTree/index.js';

import { ReactElement } from 'react';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => {
  const html = renderToStaticMarkup(rootElement);
  const tree = htmlToTree(html);
  return documentRootToDom(tree, options);
};
