import { reactToDocumentRoot } from './lib/reactToDocumentRoot/index.js';
import {
  type DocumentRootToPdfOptions,
  documentRootToPdf,
} from './lib/documentRootToPdf/index.js';
import { ReactElement } from 'react';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return documentRootToPdf(await reactToDocumentRoot(rootElement), options);
};