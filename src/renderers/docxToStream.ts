import { type Document, Packer } from 'docx';

export const docxToStream = (docx: Document) => Packer.toStream(docx);
