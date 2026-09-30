import { htmlToPackedDocx, type HtmlToDocxOptions } from './parsers/docx';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export const reactToDocx = async (
  DocumentRoot: DocumentRootComponent,
  options: HtmlToDocxOptions,
) => htmlToPackedDocx(reactToHtml(DocumentRoot, 'docx'), options);
