import { Packer } from 'docx';
import JSZip from 'jszip';
import { render } from 'src/entities';
import xmlFormat from 'xml-formatter';

type DocumentEl = JSX.Element;

const renderToDocx = (documentEl: DocumentEl) => render(documentEl, 'docx');

export const renderDocumentToDocxBuffer = async (documentEl: DocumentEl) =>
  Packer.toBuffer(renderToDocx(documentEl));

export const renderDocumentToDocxStream = async (documentEl: DocumentEl) =>
  Packer.toStream(renderToDocx(documentEl));

export const renderDocumentToDocxXml = async (documentEl: DocumentEl) =>
  Packer.toBuffer(renderToDocx(documentEl))
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'))
    .then(xmlFormat);
