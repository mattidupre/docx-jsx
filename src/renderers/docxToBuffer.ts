import { type Document, Packer } from 'docx';

export const docxToBuffer = (docx: Document) => Packer.toBuffer(docx);
