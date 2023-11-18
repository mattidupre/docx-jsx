import { reactToDocumentRoot } from './lib/reactToDocumentRoot';
import { documentRootToDocx } from './lib/documentRootToDocx';
import { ReactElement } from 'react';
import { Packer } from 'docx';

export type ReactToDocxOptions = {};

export const reactToDocx = async (
  rootElement: ReactElement,
  options: ReactToDocxOptions,
) => {
  const docx = documentRootToDocx(await reactToDocumentRoot(rootElement));
  return Packer.toBuffer(docx);
};
