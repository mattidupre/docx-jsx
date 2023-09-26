import { renderDocument } from './docX';
import { Packer } from 'docx';
import { type ReactElement } from 'react';
import JSZip from 'jszip';

export const renderToDocXStream = async (rootEl: ReactElement) =>
  Packer.toStream(renderDocument(rootEl));

export const renderToDocXBuffer = async (rootEl: ReactElement) =>
  Packer.toBuffer(renderDocument(rootEl));

export const renderToDocXXml = async (rootEl: ReactElement) =>
  Packer.toBuffer(renderDocument(rootEl))
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'));
