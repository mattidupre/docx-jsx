import { type DocumentRootComponent, reactToHtml } from './lib/reactToHtml';
import { htmlToScript, type HtmlToScriptOptions } from './parsers/script';

export const reactToScript = (
  DocumentRoot: DocumentRootComponent,
  options: HtmlToScriptOptions,
) => htmlToScript(reactToHtml(DocumentRoot, 'pdf'), options);
