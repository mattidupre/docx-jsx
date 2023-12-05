import {
  type DocumentRootToPdfOptions,
  documentRootToPdf,
} from './lib/treeToPdf/index.js';
import { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToTree } from './lib/htmlToTree/index.js';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  const html = renderToStaticMarkup(rootElement);
  const tree = htmlToTree(html);
  return documentRootToPdf(tree, options);
};
