import {
  documentRootToDom,
  type DocumentRootToDomOptions,
} from './lib/documentRootToDom';
import { reactToDocumentRoot } from './lib/reactToDocumentRoot';
import { ReactElement } from 'react';

export type ReactToDomOptions = DocumentRootToDomOptions;

export const reactToDom = async (
  rootElement: ReactElement,
  options: ReactToDomOptions,
) => documentRootToDom(await reactToDocumentRoot(rootElement), options);
