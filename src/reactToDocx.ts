import { Packer } from 'docx';
import { htmlToDocx, type HtmlToDocxOptions } from './parsers/docx';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export const reactToDocx = async (
  DocumentRoot: DocumentRootComponent,
  options: HtmlToDocxOptions,
) =>
  Packer.toBuffer(await htmlToDocx(reactToHtml(DocumentRoot, 'docx'), options));
