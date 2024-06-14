import { htmlToDom, type HtmlToDomOptions } from './parsers/dom';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export type ReactToDomOptions = HtmlToDomOptions;

export const reactToDom = async (
  DocumentRoot: DocumentRootComponent,
  options: HtmlToDomOptions,
) => htmlToDom(reactToHtml(DocumentRoot, 'pdf'), options);
