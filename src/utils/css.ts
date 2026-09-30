import type { CSSProperties } from 'react';
import { kebabCase, transform } from 'lodash';

export type CssVarName = `--${string}`;

export type CssRuleTuple = [string, CSSProperties];

export type CssRulesArray = Array<CssRuleTuple>;

export type CssRuleDeclarations = CSSProperties & Record<CssVarName, string>;

/** React spells vendor properties `WebkitFontSmoothing` and `msTransform`. */
const VENDOR_PROPERTY_EXP = /^(Webkit|Moz|ms)[A-Z]/;

/**
 * The CSS name of a property in React's spelling: `fontSize` is `font-size`,
 * `WebkitFontSmoothing` is `-webkit-font-smoothing`, and a custom property is
 * left exactly as it was written.
 */
export const toCssPropertyName = (property: string) => {
  // Custom property names are case sensitive and written as they are meant.
  if (property.startsWith('--')) {
    return property;
  }
  const base = kebabCase(property);
  if (property.startsWith('-') || VENDOR_PROPERTY_EXP.test(property)) {
    return `-${base}`;
  }
  return base;
};

export const flattenCssVariables = (value: string): Array<string> => {
  if (!/^var\(|^--/.test(value.trim())) {
    return [value];
  }
  const results: Array<string> = [];
  let nextValue = value;
  while (true) {
    const [, resultA, resultB] = /^([\w\d-]+)\s*,\s*(.*)$/.exec(
      nextValue.trim(),
    ) ?? [, '', nextValue.trim()];
    if (resultA) {
      results.push(resultA);
    }
    const [, resultC] = /^var\(\s*(.*)\)$/.exec(resultB.trim()) ?? [, ''];
    if (resultC && resultC !== nextValue) {
      nextValue = resultC;
      continue;
    } else if (!resultB.includes('var(')) {
      results.push(resultB.trim());
      break;
    }
    throw new Error(`Invalid css variable string ${value}`);
  }
  return results;
};

/**
 * Convert a possible array to a valid CSS var declaration.
 * @example
 * createCssVarDeclaration(['--var1', '--var2', 'red']);
 * // 'var(--var1, var(--var2, red))'
 */
export const toVarDeclaration = (value: unknown): undefined | string => {
  if (!value || (Array.isArray(value) && !value.length)) {
    return undefined;
  }
  const [currentValue, ...remainingValues] = [value]
    .flat(Infinity)
    .flatMap((v) => (typeof v === 'string' ? flattenCssVariables(v) : []));

  if (!currentValue) {
    return toVarDeclaration(remainingValues);
  }

  const isCurrentValueCssVariable =
    typeof currentValue === 'string' &&
    (currentValue.startsWith('--') || currentValue.startsWith('var(--'));

  if (isCurrentValueCssVariable) {
    if (remainingValues.length) {
      return `var(${currentValue}, ${toVarDeclaration(remainingValues)})`;
    }
    return `var(${currentValue})`;
  }

  return String(currentValue);
};

/**
 * Convert an object of CSS styles to a DOM-compatible string of declarations.
 */
export const styleObjectToString = (
  cssObject: CSSProperties,
  separator = ' ',
) => {
  const styleStrings: Array<string> = [];
  for (const property in cssObject) {
    styleStrings.push(
      `${toCssPropertyName(property)}: ${
        cssObject[property as keyof CSSProperties]
      };`,
    );
  }
  return styleStrings.join(separator);
};

export const cssRulesArrayToString = (cssRules: CssRulesArray) => {
  let styleStrings: Array<string> = [];
  for (const [selector, declaration] of cssRules) {
    styleStrings.push(
      `${selector} {\n  ${styleObjectToString(declaration, '\n  ')}\n}`,
    );
  }
  return styleStrings.join('\n');
};

export const toCssStyleSheets = (...values: ReadonlyArray<any>) =>
  Promise.all(
    transform(
      values,
      async (styleSheets, value) => {
        if (!value) {
          return;
        }
        if (value instanceof CSSStyleSheet) {
          styleSheets.push(value);
          return;
        }
        let valueString = value;
        if (value instanceof URL) {
          valueString = await (await fetch(value)).text();
        }
        if (typeof valueString === 'string') {
          const styleSheet = new CSSStyleSheet();
          styleSheets.push(styleSheet.replace(valueString));
          return;
        }
        throw new TypeError('Invalid stylesheet value');
      },
      [] as Array<CSSStyleSheet | Promise<CSSStyleSheet>>,
    ),
  );
