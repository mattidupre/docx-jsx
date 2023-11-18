import { reactToDocumentRoot } from './lib/reactToDocumentRoot';
import {
  type DocumentRootToPdfOptions,
  documentRootToPdf,
} from './lib/documentRootToPdf';
import { ReactElement } from 'react';

export type ReactToPdfOptions = DocumentRootToPdfOptions;

export const reactToPdf = async (
  rootElement: ReactElement,
  options: ReactToPdfOptions,
) => {
  return documentRootToPdf(await reactToDocumentRoot(rootElement), options);
};
