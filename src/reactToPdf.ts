import { type DocumentRootToPdfOptions, htmlToPdf } from './lib/htmlToPdf.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactElement } from 'react';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(renderToStaticMarkup(rootElement), options);
};
