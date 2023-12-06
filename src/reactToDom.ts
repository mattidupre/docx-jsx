import { htmlToDom, type DocumentRootToDomOptions } from './lib/htmlToDom.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactElement } from 'react';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => htmlToDom(renderToStaticMarkup(rootElement), options);
