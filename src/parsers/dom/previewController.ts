import { getElementInnerSize, getElementOuterSize } from '../../utils/elements';
import { createDocumentStyles, type DocumentStyles } from './documentStyles';
import { htmlToDom, type HtmlToDomOptions } from './htmlToDom';

/** A preview adopts its stylesheets itself, into its own document. */
export type PreviewRenderOptions = Omit<HtmlToDomOptions, 'documentStyles'>;

export type PreviewController = {
  /**
   * Paginates `html` (the `pdf` markup of a document) and shows it in the host
   * element, replacing the pages of an earlier render and taking that
   * render's stylesheets out of the document. Resolves `false`, and changes
   * nothing, when a later `render` or a `clear` superseded it.
   */
  render: (html: string, options?: PreviewRenderOptions) => Promise<boolean>;
  /** Scales the pages to the host element's width while it is resized. */
  setAutoscale: (autoscale: boolean) => void;
  /**
   * Removes the pages and their stylesheets, abandons a render in progress
   * and stops observing the host. The controller can render again after.
   */
  clear: () => void;
};

type CurrentRender = {
  documentEl: HTMLElement;
  documentStyles: DocumentStyles;
  size: undefined | { width: number; height: number };
};

/**
 * The framework-free core of a live preview, bound to `hostElement`:
 * `<matti-docs-preview>` is one around itself, and React's `usePreview` one
 * around the element its ref is attached to.
 */
export const createPreviewController = (
  hostElement: HTMLElement,
): PreviewController => {
  let renderCount = 0;
  let current: undefined | CurrentRender;
  // The registry of the render in progress, if there is one: pagination
  // cannot be interrupted, but a superseded render's stylesheets can be taken
  // out of the document at once rather than when it finishes.
  let pendingStyles: undefined | DocumentStyles;
  let observer: undefined | ResizeObserver;

  const scaleToHost = () => {
    const previewSize = getElementInnerSize(hostElement);
    if (!current?.size || !previewSize) {
      return;
    }
    const { documentEl, size } = current;
    const scale = previewSize.width / size.width;
    const overflowY = (1 - scale) * size.height;
    documentEl.style.transformOrigin = 'top center';
    documentEl.style.transform = `scale(${scale})`;
    documentEl.style.marginBottom = `-${overflowY}px`;
  };

  const removeCurrent = () => {
    if (!current) {
      return;
    }
    current.documentEl.remove();
    current.documentStyles.dispose();
    current = undefined;
  };

  return {
    render: async (html, options = {}) => {
      renderCount += 1;
      const renderId = renderCount;
      pendingStyles?.dispose();
      const documentStyles = createDocumentStyles(hostElement.ownerDocument);
      pendingStyles = documentStyles;
      let documentEl: HTMLElement;
      try {
        documentEl = await htmlToDom(html, { ...options, documentStyles });
      } catch (error) {
        documentStyles.dispose();
        throw error;
      } finally {
        if (pendingStyles === documentStyles) {
          pendingStyles = undefined;
        }
      }
      if (renderId !== renderCount) {
        documentStyles.dispose();
        return false;
      }
      removeCurrent();
      hostElement.append(documentEl);
      current = {
        documentEl,
        documentStyles,
        size: getElementOuterSize(documentEl),
      };
      if (observer) {
        scaleToHost();
      }
      return true;
    },
    setAutoscale: (autoscale) => {
      if (!autoscale) {
        observer?.disconnect();
        observer = undefined;
        return;
      }
      if (observer) {
        return;
      }
      hostElement.style.setProperty('width', '100%');
      hostElement.style.setProperty('display', 'flex');
      hostElement.style.setProperty('justify-content', 'center');
      hostElement.style.setProperty('align-items', 'center');
      const view = hostElement.ownerDocument.defaultView ?? window;
      observer = new view.ResizeObserver(scaleToHost);
      observer.observe(hostElement);
    },
    clear: () => {
      renderCount += 1;
      pendingStyles?.dispose();
      pendingStyles = undefined;
      removeCurrent();
      observer?.disconnect();
      observer = undefined;
    },
  };
};
