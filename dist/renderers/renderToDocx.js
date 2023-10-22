import { Packer } from 'docx';
import JSZip from 'jszip';
import xmlFormat from 'xml-formatter';
import { createRenderer } from 'src/lib/renderer';
import { parseOptionsToDocx } from 'src/lib/parse';
export const renderToDocx = createRenderer(parseOptionsToDocx);
export const renderDocumentToDocxBuffer = async (documentEl) => Packer.toBuffer(renderToDocx(documentEl));
export const renderDocumentToDocxStream = async (documentEl) => Packer.toStream(renderToDocx(documentEl));
export const renderDocumentToDocxXml = async (documentEl) => Packer.toBuffer(renderToDocx(documentEl))
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'))
    .then(xmlFormat);
//# sourceMappingURL=renderToDocx.js.map