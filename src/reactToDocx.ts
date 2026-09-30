import { htmlToPackedDocx, type HtmlToDocxOptions } from './parsers/docx';
import { MISSING_MASONRY_LAYOUT_MESSAGE } from './parsers/docx/masonryToDocx';
import { htmlToLayout } from './parsers/pdf/htmlToLayout';
import type { HtmlToPdfOptions } from './parsers/pdf';
import { reactToHtml, type DocumentRootComponent } from './lib/reactToHtml';

export type ReactToDocxOptions = Omit<HtmlToDocxOptions, 'layout'> &
  Partial<
    Pick<
      HtmlToPdfOptions,
      'browser' | 'closeBrowser' | 'pageStyleSheets' | 'styleSheets'
    >
  >;

/**
 * The DOCX of a document. A document with masonry columns is first laid out
 * in `browser` exactly as `reactToPdf` lays it out (pass the same options),
 * so its units are packed in the same order; any other document needs no
 * browser, and none is opened for it.
 */
export const reactToDocx = async (
  DocumentRoot: DocumentRootComponent,
  {
    browser,
    closeBrowser,
    pageStyleSheets,
    styleSheets,
    ...options
  }: ReactToDocxOptions,
) => {
  try {
    return await htmlToPackedDocx(reactToHtml(DocumentRoot, 'docx'), {
      ...options,
      layout: () => {
        if (!browser) {
          throw new Error(MISSING_MASONRY_LAYOUT_MESSAGE);
        }
        return htmlToLayout(reactToHtml(DocumentRoot, 'pdf'), {
          browser,
          pageStyleSheets,
          styleSheets,
          fonts: options.fonts,
          publicDirectory: options.publicDirectory,
        });
      },
    });
  } finally {
    if (closeBrowser) {
      try {
        await browser?.close();
      } catch (error) {
        console.error('Cannot close browser', error);
      }
    }
  }
};
