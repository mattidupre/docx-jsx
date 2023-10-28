import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { htmlToPdfOptions } from 'src/lib/htmlToPdfOptions';

export const reactToDocumentOptions = (rootNode: ReactNode) => {
  const markup = renderToStaticMarkup(createElement(Fragment, {}, rootNode));
  return htmlToPdfOptions(markup);
};
