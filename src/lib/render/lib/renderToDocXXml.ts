import { renderDocX } from 'src/lib/docX';
import { Packer } from 'docx';
import { type ReactElement } from 'react';
import JSZip from 'jszip';

export const renderToDocXXml = async (rootEl: ReactElement) =>
  Packer.toBuffer(renderDocX(rootEl))
    .then((buffer) => JSZip.loadAsync(buffer))
    .then(({ files }) => files['word/document.xml'].async('string'));
