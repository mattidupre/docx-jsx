import { type DocumentRootToPdfOptions, treeToPdf } from './lib/treeToPdf.js';
import { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToTree } from './lib/htmlToTree.js';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  const html = renderToStaticMarkup(rootElement);
  const tree = htmlToTree(html);
  return treeToPdf(tree, options);
};
