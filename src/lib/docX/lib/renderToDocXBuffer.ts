import { renderDocXDocument } from './renderDocXDocument';
import { Packer } from 'docx';
import { type ReactElement } from 'react';

export const renderToDocXBuffer = async (rootEl: ReactElement) =>
  Packer.toBuffer(renderDocXDocument(rootEl));
