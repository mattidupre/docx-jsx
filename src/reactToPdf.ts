import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { type DocumentRootToPdfOptions, htmlToPdf } from './lib/htmlToPdf.js';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(renderToStaticMarkup(rootElement), options);
};
