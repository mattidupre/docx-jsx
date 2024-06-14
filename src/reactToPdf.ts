import { type HtmlToPdfOptions, htmlToPdf } from './parsers/pdf';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export type ReactToPdfOptions = HtmlToPdfOptions;

export const reactToPdf = async (
  DocumentRoot: DocumentRootComponent,
  options: ReactToPdfOptions,
) => {
  return htmlToPdf(reactToHtml(DocumentRoot, 'pdf'), options);
};
