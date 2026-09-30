import type { FragmentationLayout } from '../../fragmenter/model';
import { renderInBrowser, type BrowserRenderOptions } from './renderInBrowser';

/**
 * Lays `html` out in the browser exactly as `htmlToPdf` does, and returns the
 * layout a target that cannot lay out follows: the packed order of masonry
 * columns. Nothing is printed.
 */
export const htmlToLayout = (
  html: string,
  options: BrowserRenderOptions,
): Promise<FragmentationLayout> =>
  renderInBrowser(html, options, async (_page, { layout }) => layout);
