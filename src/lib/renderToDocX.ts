import { Document, Packer } from 'docx';
import { parseSectionInstances } from './docXClasses';
import { elementToDocX } from './elementToDocX';
import { renderDocumentWrapper } from './renderWrapper';

const renderDocument = (element: JSX.Element) =>
  new Document({
    sections: parseSectionInstances(
      renderDocumentWrapper(() => elementToDocX(element)),
    ),
  });

export const renderToDocX = (...args: Parameters<typeof renderDocument>) =>
  Packer.toBuffer(renderDocument(...args));

export const renderToDocXStream = (
  ...args: Parameters<typeof renderDocument>
) => Packer.toStream(renderDocument(...args));
