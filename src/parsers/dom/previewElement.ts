import {
  createPreviewController,
  type PreviewRenderOptions,
} from './previewController';

export const PREVIEW_ELEMENT_TAG_NAME = 'matti-docs-preview';

/**
 * A live preview of a document, with no framework: give it the `pdf` markup
 * of a document (what `reactToHtml(Document, 'pdf')` returns, rendered
 * wherever React lives) and it paginates and shows it. Rendering again
 * replaces the pages; removing the element takes its pages and stylesheets
 * out of the document, and putting it back renders the last markup again.
 *
 * The pages are its light DOM children, like any other rendered page, so the
 * element has no shadow root of its own. The `autoscale` attribute scales them
 * to its width, and `aria-busy` is set while a render is in progress.
 */
export interface PreviewElement extends HTMLElement {
  /** Resolves `false` when a later render superseded this one. */
  render(html: string, options?: PreviewRenderOptions): Promise<boolean>;
}

declare global {
  interface HTMLElementTagNameMap {
    [PREVIEW_ELEMENT_TAG_NAME]: PreviewElement;
  }
}

const createPreviewElementClass = (view: Window & typeof globalThis) =>
  class MattiDocsPreviewElement
    extends view.HTMLElement
    implements PreviewElement
  {
    static readonly observedAttributes = ['autoscale'];

    readonly #controller = createPreviewController(this);

    #lastRender: undefined | [string, undefined | PreviewRenderOptions];

    #pendingRenders = 0;

    async render(html: string, options?: PreviewRenderOptions) {
      this.#lastRender = [html, options];
      this.#pendingRenders += 1;
      this.setAttribute('aria-busy', 'true');
      try {
        return await this.#controller.render(html, options);
      } finally {
        this.#pendingRenders -= 1;
        if (this.#pendingRenders === 0) {
          this.removeAttribute('aria-busy');
        }
      }
    }

    connectedCallback() {
      this.#controller.setAutoscale(this.hasAttribute('autoscale'));
      if (this.#lastRender && !this.hasChildNodes()) {
        void this.render(...this.#lastRender);
      }
    }

    disconnectedCallback() {
      this.#controller.clear();
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.#controller.setAutoscale(this.hasAttribute('autoscale'));
      }
    }
  };

/**
 * Registers `<matti-docs-preview>` in the realm of `view`, unless it already
 * is. The first definition in a realm wins.
 */
export const definePreviewElement = (
  view: Window & typeof globalThis = window,
): void => {
  if (!view.customElements.get(PREVIEW_ELEMENT_TAG_NAME)) {
    view.customElements.define(
      PREVIEW_ELEMENT_TAG_NAME,
      createPreviewElementClass(view),
    );
  }
};
