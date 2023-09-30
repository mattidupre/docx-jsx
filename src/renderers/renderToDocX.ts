import { Packer } from 'docx';
import JSZip from 'jszip';
import { parseNode } from 'src/lib/render';

type DocumentEl = JSX.Element;

const renderDocX = parseNode('docx', node, (context) => {
  return renderer(context);
});

export const renderDocumentToDocXBuffer = async (documentEl: DocumentEl) =>
  Packer.toBuffer(renderDocX(documentEl));

export const renderDocumentToDocXStream = async (documentEl: DocumentEl) =>
  Packer.toStream(renderDocX(documentEl));

export const renderDocumentToDocXXml = async (documentEl: DocumentEl) =>
  Packer.toBuffer(renderDocX(documentEl))
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'));
