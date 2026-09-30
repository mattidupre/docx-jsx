import {
  PAGE_BOX_CLASS_NAME,
  PAGE_PARTS,
  type PagePart,
} from '../../lib/pageStyles';

export const PAGE_ELEMENT_TAG_NAME = 'matti-docs-page';

/**
 * The slot a light DOM child of a page is placed in. Content takes the
 * default slot, so the nodes pagedjs hands over are appended as they are.
 */
export const PAGE_SLOTS = {
  header: 'header',
  content: undefined,
  footer: 'footer',
} as const satisfies Record<PagePart, undefined | string>;

export type PageContentMeasurement = {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
};

/**
 * A rendered page: the page box and its three regions in a shadow root, which
 * no rule of the host page reaches, and the document content in the light DOM,
 * slotted into them.
 *
 * The content has to stay in the light DOM. Chrome resolves `href="#id"`
 * against the document and collects PDF link destinations by walking it, and
 * never looks inside a shadow root; the page counters are filled into the
 * header and footer nodes; and a consumer's stylesheet has to reach the
 * content. The regions are `::part(header)`, `::part(content)` and
 * `::part(footer)` to a stylesheet outside.
 */
export interface PageElement extends HTMLElement {
  /** Replaces the stylesheets of the page's shadow root. */
  adoptShadowStyleSheets(styleSheets: ReadonlyArray<CSSStyleSheet>): void;
  /** The laid out size of the page box and of its content region, in px. */
  measureContent(): PageContentMeasurement;
}

declare global {
  interface HTMLElementTagNameMap {
    [PAGE_ELEMENT_TAG_NAME]: PageElement;
  }
}

const createPageElementClass = (view: Window & typeof globalThis) =>
  class MattiDocsPageElement extends view.HTMLElement implements PageElement {
    readonly #shadowRoot: ShadowRoot;

    readonly #pageBox: HTMLElement;

    readonly #regions: Record<PagePart, HTMLElement>;

    constructor() {
      super();
      this.#shadowRoot = this.attachShadow({ mode: 'open' });
      const { ownerDocument } = this;

      this.#pageBox = ownerDocument.createElement('div');
      this.#pageBox.className = PAGE_BOX_CLASS_NAME;

      const regions: Partial<Record<PagePart, HTMLElement>> = {};
      for (const part of PAGE_PARTS) {
        const region = ownerDocument.createElement('div');
        region.className = part;
        region.setAttribute('part', part);
        const slot = ownerDocument.createElement('slot');
        const slotName = PAGE_SLOTS[part];
        if (slotName) {
          slot.name = slotName;
        }
        region.append(slot);
        this.#pageBox.append(region);
        regions[part] = region;
      }
      const { header, content, footer } = regions;
      if (!header || !content || !footer) {
        throw new Error('A page region was not created.');
      }
      this.#regions = { header, content, footer };

      this.#shadowRoot.append(this.#pageBox);
    }

    #shadowCssTexts: ReadonlyArray<string> = [];

    adoptShadowStyleSheets(styleSheets: ReadonlyArray<CSSStyleSheet>) {
      this.#shadowCssTexts = styleSheets.map((styleSheet) =>
        Array.from(styleSheet.cssRules, (rule) => rule.cssText).join('\n'),
      );
      this.#shadowRoot.adoptedStyleSheets = [...styleSheets];
    }

    /**
     * A document only applies constructed stylesheets of its own realm, so a
     * page moved into another document (a preview in an iframe is rendered in
     * the parent's realm, then attached) rebuilds its shadow stylesheets
     * there, as matti-kit's `keepShadowStylesAcrossDocuments` does.
     */
    adoptedCallback(_oldDocument: Document, newDocument: Document) {
      const newView = newDocument.defaultView;
      if (!newView) {
        return;
      }
      this.#shadowRoot.adoptedStyleSheets = this.#shadowCssTexts.map(
        (cssText) => {
          const styleSheet = new newView.CSSStyleSheet();
          styleSheet.replaceSync(cssText);
          return styleSheet;
        },
      );
    }

    measureContent(): PageContentMeasurement {
      const { width: pageWidth, height: pageHeight } =
        this.#pageBox.getBoundingClientRect();
      const style = (this.ownerDocument.defaultView ?? view).getComputedStyle(
        this.#regions.content,
      );
      return {
        pageWidth,
        pageHeight,
        contentWidth: Number.parseInt(style.width, 10),
        contentHeight: Number.parseInt(style.height, 10),
      };
    }
  };

/**
 * Registers `<matti-docs-page>` in the realm of `view`, unless it already is.
 * Registration is per realm (an iframe has a registry of its own), and the
 * first definition wins, so two copies of the library in one document share
 * whichever registered first.
 */
export const definePageElement = (
  view: Window & typeof globalThis = window,
): void => {
  if (!view.customElements.get(PAGE_ELEMENT_TAG_NAME)) {
    view.customElements.define(
      PAGE_ELEMENT_TAG_NAME,
      createPageElementClass(view),
    );
  }
};
