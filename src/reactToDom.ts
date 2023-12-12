import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { htmlToDom, type DocumentRootToDomOptions } from './lib/htmlToDom.js';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => htmlToDom(renderToStaticMarkup(rootElement), options);
