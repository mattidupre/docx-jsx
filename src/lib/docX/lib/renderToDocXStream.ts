import { renderDocXDocument } from './renderDocXDocument';
import { Packer } from 'docx';
import { type ReactElement } from 'react';

export const renderToDocXStream = async (rootEl: ReactElement) =>
  Packer.toStream(renderDocXDocument(rootEl));
