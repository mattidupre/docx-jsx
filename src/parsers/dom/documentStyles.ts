import {
  type StyleSheetSource,
  toCssText,
  toScopedStyleSheet,
} from './scopedStyleSheets';

/**
 * The stylesheets one render adopted into one document, and the means to take
 * them out again.
 */
export type DocumentStyles = {
  readonly document: Document;
  /**
   * Adopts `style` into the document, limited to the subtree of
   * `scopeSelector` when one is given. Adopting the same CSS under the same
   * scope twice is a no-op, so a render can adopt per page without cost.
   */
  adopt: (style: StyleSheetSource, scopeSelector?: string) => void;
  /**
   * Removes every stylesheet this registry adopted from the document. A render
   * still running when its registry is disposed cannot adopt anything more.
   */
  dispose: () => void;
};

/**
 * A registry of the stylesheets adopted into `targetDocument`, owned by
 * whoever renders into it: a preview disposes it when it unmounts or renders
 * again, and a script or PDF run keeps its own for the life of the page.
 *
 * The sheets are adopted by the document rather than embedded in each page: a
 * document is paginated into one root per page and a copy of every rule in
 * each of them would multiply style recalculation by the page count. They are
 * constructed in the document's own realm, the only realm whose constructed
 * sheets it may adopt, so a preview in an iframe is styled like any other.
 */
export const createDocumentStyles = (
  targetDocument: Document,
): DocumentStyles => {
  const view = targetDocument.defaultView;
  if (!view) {
    throw new Error('Cannot adopt stylesheets into a document with no window.');
  }

  // Keyed by source text rather than identity: a render builds fresh
  // `CSSStyleSheet`s for the same CSS.
  const adopted = new Map<string, CSSStyleSheet>();
  let isDisposed = false;

  return {
    document: targetDocument,
    adopt: (style, scopeSelector) => {
      if (isDisposed) {
        return;
      }
      const cssText = toCssText(style);
      const key = scopeSelector
        ? `@scope (${scopeSelector}) {\n${cssText}\n}`
        : cssText;
      if (adopted.has(key)) {
        return;
      }
      let styleSheet: CSSStyleSheet;
      if (scopeSelector) {
        styleSheet = toScopedStyleSheet(cssText, scopeSelector, view);
      } else {
        styleSheet = new view.CSSStyleSheet();
        styleSheet.replaceSync(cssText);
      }
      adopted.set(key, styleSheet);
      targetDocument.adoptedStyleSheets = [
        ...targetDocument.adoptedStyleSheets,
        styleSheet,
      ];
    },
    dispose: () => {
      isDisposed = true;
      const own = new Set(adopted.values());
      adopted.clear();
      targetDocument.adoptedStyleSheets =
        targetDocument.adoptedStyleSheets.filter(
          (styleSheet) => !own.has(styleSheet),
        );
    },
  };
};
