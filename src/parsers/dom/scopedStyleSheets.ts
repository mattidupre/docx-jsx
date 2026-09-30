/**
 * At-rules that describe the document rather than style a subtree. `@scope`
 * may only contain style rules, so these are re-emitted next to the scoped
 * block instead of inside it, where the parser would drop them.
 */
const UNSCOPABLE_AT_RULE =
  /^@(charset|import|namespace|font-face|font-feature-values|font-palette-values|counter-style|property|page|(-\w+-)?keyframes)\b/;

export type StyleSheetSource = string | CSSStyleSheet | HTMLStyleElement;

export const toCssText = (style: StyleSheetSource): string =>
  typeof style === 'string'
    ? style
    : style instanceof CSSStyleSheet
    ? Array.from(style.cssRules, (rule) => rule.cssText).join('\n')
    : // A `<style>` element only exposes `sheet` once it is in a document, so
      // its text is used directly. `disabled` is ignored on purpose: the
      // element is a carrier for CSS here, not a live stylesheet.
      (style.textContent ?? '');

/** `:host`, but not `:host-context`. */
const HOST_SELECTOR = /:host(?![\w-])(?:\(([^()]*)\))?/g;

/**
 * Rewrites `:host` to `:scope`.
 *
 * The page container used to be a shadow host, so `:host` was how a stylesheet
 * passed to the renderer reached it. It is now the `@scope` root, which is the
 * same element and the same specificity under a different name.
 */
const replaceHostSelectors = (rules: CSSRuleList): void => {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const selectorText = rule.selectorText.replace(
        HOST_SELECTOR,
        (_match: string, argument: undefined | string) =>
          argument ? `:scope:is(${argument})` : ':scope',
      );
      if (selectorText !== rule.selectorText) {
        rule.selectorText = selectorText;
      }
    }
    // Nested style rules are grouping rules too, so this also reaches a `:host`
    // written inside `@media` or inside another rule.
    if (rule instanceof CSSGroupingRule) {
      replaceHostSelectors(rule.cssRules);
    }
  }
};

/**
 * `style` as a new stylesheet of `view`'s realm whose rules only apply below
 * `scopeSelector`, with `:host` rewritten to the scope root.
 *
 * Page content used to live in a closed shadow root, which kept these rules out
 * of the surrounding application but also hid every anchor target from
 * `document.getElementById`. Chrome resolves `href="#id"` against the document
 * and collects link destinations by walking it, so an internal link inside a
 * shadow root produced no PDF link annotation at all. `@scope` gives the same
 * one-way containment in the light DOM, and the prelude adds no specificity.
 *
 * The library's own rules and a consumer's are scoped the same way in every
 * realm -- to the page root on screen and to the content root the Fragmenter
 * measures in -- so they keep the same order, specificity and proximity
 * against each other wherever they apply.
 */
export const toScopedStyleSheet = (
  style: StyleSheetSource,
  scopeSelector: string,
  view: Window & typeof globalThis = window,
): CSSStyleSheet => {
  const cssText = toCssText(style);

  // Re-parsed into a sheet of its own so that `:host` can be rewritten through
  // the CSSOM, and so that a caller's `CSSStyleSheet` is never mutated.
  const parsedStyleSheet = new CSSStyleSheet();
  parsedStyleSheet.replaceSync(cssText);
  replaceHostSelectors(parsedStyleSheet.cssRules);

  const scopable: Array<string> = [];
  const unscopable: Array<string> = [];
  for (const rule of Array.from(parsedStyleSheet.cssRules)) {
    (UNSCOPABLE_AT_RULE.test(rule.cssText) ? unscopable : scopable).push(
      rule.cssText,
    );
  }

  // A constructed stylesheet can only be adopted by a document of the realm
  // that constructed it.
  const scopedStyleSheet = new view.CSSStyleSheet();
  scopedStyleSheet.replaceSync(
    [
      ...unscopable,
      ...(scopable.length
        ? [`@scope (${scopeSelector}) {\n${scopable.join('\n')}\n}`]
        : []),
    ].join('\n'),
  );

  return scopedStyleSheet;
};
