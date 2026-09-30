/**
 * `<matti-docs-preview>`: a live preview with no React, for an application
 * that renders the document's markup elsewhere (a server, a federated
 * remote) and only shows it.
 */
export {
  PREVIEW_ELEMENT_TAG_NAME,
  definePreviewElement,
  type PreviewElement,
} from './parsers/dom/previewElement';
export type { PreviewRenderOptions } from './parsers/dom/previewController';
