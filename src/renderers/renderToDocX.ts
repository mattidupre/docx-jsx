import { Packer } from 'docx';
import JSZip from 'jszip';
import xmlFormat from 'xml-formatter';
import { type ReactNode } from 'react';
import { createRenderer } from 'src/lib/createRenderer';
import { docxRenderer } from 'src/entities';
import { reactParser } from 'src/lib/reactParser';

export const renderToDocx = createRenderer({
  parser: reactParser,
  renderer: docxRenderer,
});

export const renderDocumentToDocxBuffer = async (documentEl: ReactNode) =>
  Packer.toBuffer(renderToDocx(documentEl));

export const renderDocumentToDocxStream = async (documentEl: ReactNode) =>
  Packer.toStream(renderToDocx(documentEl));

export const renderDocumentToDocxXml = async (documentEl: ReactNode) => {
  const result = renderToDocx(documentEl);
  return Packer.toBuffer(result)
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'))
    .then(xmlFormat);
};
