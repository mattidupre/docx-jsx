import type { ErrorObject } from '../../utils';
import { renderInBrowser, type BrowserRenderOptions } from './renderInBrowser';

export type HtmlToPdfOptions = BrowserRenderOptions & {
  closeBrowser?: boolean;
};

export const htmlToPdf = async (
  html: string,
  { closeBrowser, ...options }: HtmlToPdfOptions,
): Promise<ErrorObject | Uint8Array<ArrayBufferLike>> => {
  try {
    return await renderInBrowser(html, options, (page, { size }) =>
      page.pdf({
        ...size,
        printBackground: true,
        displayHeaderFooter: false,
      }),
    );
  } catch (error) {
    return { error };
  } finally {
    if (closeBrowser) {
      try {
        await options.browser.close();
      } catch (error) {
        console.error('Cannot close browser', error);
      }
    }
  }
};
