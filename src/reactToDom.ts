import {
  documentRootToDom,
  type DocumentRootToDomOptions,
} from './lib/documentRootToDom/index.js';
import { reactToDocumentRoot } from './lib/reactToDocumentRoot/index.js';
import { ReactElement } from 'react';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => {
  return documentRootToDom(await reactToDocumentRoot(rootElement), options);
};
