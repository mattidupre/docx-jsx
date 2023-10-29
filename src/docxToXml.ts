import JSZip from 'jszip';
import xmlFormat from 'xml-formatter';

export const docxToXml = (buffer: Buffer) => {
  return JSZip.loadAsync(buffer)
    .then(({ files }) => files['word/document.xml'].async('string'))
    .then(xmlFormat);
};
