import type { Preset } from '@pandacss/dev';
import { type CssRulesArray, toCssPropertyName } from '../utils/css';

type GlobalCss = NonNullable<Preset['globalCss']>;

type StyleObject = NonNullable<GlobalCss[string]>;

/**
 * Rules as a Panda `globalCss` object. Property names are written in CSS
 * spelling on purpose: Panda resolves the value of a camel cased property
 * against the application's tokens (`fontWeight: 'bold'` would become
 * `var(--font-weights-bold)`), and these values have to reach the browser
 * exactly as the DOCX target reads them.
 *
 * An object cannot hold a selector twice, and merging two rules would move
 * one of them in the cascade, so a repeated selector is refused.
 */
export const cssRulesToGlobalCss = (rules: CssRulesArray): GlobalCss => {
  const globalCss: GlobalCss = {};
  for (const [selector, style] of rules) {
    if (selector in globalCss) {
      throw new Error(
        `"${selector}" is declared twice; merge it so its order is explicit.`,
      );
    }
    const declarations: StyleObject = {};
    for (const [property, value] of Object.entries(style)) {
      if (typeof value === 'string' || typeof value === 'number') {
        // Any property name with a string or number value is a valid style
        // object entry (Panda's `GenericProperties`), but TypeScript cannot
        // index a style object by `string`: its nested-selector index
        // signatures would claim the key too.
        Object.assign(declarations, { [toCssPropertyName(property)]: value });
      }
    }
    globalCss[selector] = declarations;
  }
  return globalCss;
};
