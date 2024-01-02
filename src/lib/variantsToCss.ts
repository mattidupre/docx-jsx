import type { CSSProperties } from 'react';
import { kebabCase } from 'lodash';
import {
  TYPOGRAPHY_CSS_KEYS,
  INTRINSIC_TYPOGRAPHY_OPTIONS,
  type Variants,
  INTRINSIC_VARIANT_TAG_NAMES,
} from '../entities/typography';
import type { PrefixesConfig } from '../entities';
import { getValueOf } from '../utils/object';

const TYPOGRAPHY_CSS_PROPERTIES = TYPOGRAPHY_CSS_KEYS.map(kebabCase);

type CssRule = [string, CSSProperties];

type CssRules = Array<CssRule>;

/**
 * Convert a variant value to a valid CSS property.
 * This allows custom variables to be passed into variants as arrays.
 */
export const toCssValue = (
  value: unknown,
  options: { prefixes: PrefixesConfig },
): undefined | string => {
  if (!value || (Array.isArray(value) && !value.length)) {
    return undefined;
  }
  const [currentValue, ...remainingValues] = [value].flat();

  if (!currentValue) {
    return toCssValue(remainingValues, options);
  }

  const isCurrentValueCssVariable =
    typeof currentValue === 'string' && currentValue.startsWith('--');

  if (remainingValues.length) {
    if (!isCurrentValueCssVariable) {
      throw new TypeError('Only the last value may be a CSS variable');
    }
    return `var(${currentValue}, ${toCssValue(remainingValues, options)})`;
  }

  if (isCurrentValueCssVariable) {
    throw new TypeError('The last value must not be a CSS variable');
  }

  return String(currentValue);
};

export const variantsToCssRules = (
  variants: Variants,
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable' | 'variantClassName'>;
  },
): CssRules => {
  const { prefixes } = options;

  // TODO: How to handle highlight, <sup>, <sub>?
  const rules: CssRules = [];

  rules.push([
    '*',
    TYPOGRAPHY_CSS_PROPERTIES.reduce(
      (declarations, property) => ({
        ...declarations,
        [property]: `var(--${prefixes.cssVariable}-${kebabCase(property)})`,
      }),
      {} as CSSProperties,
    ),
  ]);

  // Override vars are defined inline in the HTML.

  for (const tagName in INTRINSIC_TYPOGRAPHY_OPTIONS) {
    rules.push([
      `:where(${tagName})`,
      Object.fromEntries(
        Object.entries(
          INTRINSIC_TYPOGRAPHY_OPTIONS[
            tagName as keyof typeof INTRINSIC_TYPOGRAPHY_OPTIONS
          ],
        ).map(([propertyName, propertyValue]) => {
          if (
            !TYPOGRAPHY_CSS_KEYS.includes(
              propertyName as (typeof TYPOGRAPHY_CSS_KEYS)[number],
            )
          ) {
            return [];
          }
          return [
            [`--${prefixes.cssVariable}-${kebabCase(propertyName)}`],
            toCssValue(propertyValue, options),
          ];
        }),
      ),
    ]);
  }

  // Variant vars are attached to variant class names .[prefix]-[variant-name]
  for (const variantName in variants) {
    const variantKebab = kebabCase(variantName);

    const variantSelector = `.${prefixes.variantClassName}-${kebabCase(
      variantName,
    )}`;
    const tagNameSelector = getValueOf(
      variantName,
      INTRINSIC_VARIANT_TAG_NAMES,
    );

    const selector = tagNameSelector
      ? `:where(${tagNameSelector}, ${variantSelector})`
      : variantSelector;

    rules.push([
      // Variant tags set variant CSS vars.
      selector,
      Object.fromEntries(
        Object.entries(variants[variantName]).map(
          ([propertyName, propertyValue]) => {
            return [
              [
                `--${prefixes.cssVariable}-${variantKebab}-${kebabCase(
                  propertyName,
                )}`,
              ],
              toCssValue(propertyValue, options),
            ];
          },
        ),
      ),
    ]);

    rules.push([
      // Properties in variant tags default to override CSS vars but fall back to variant CSS vars.
      `:where(${selector} *)`,
      TYPOGRAPHY_CSS_PROPERTIES.reduce(
        (declarations, property) => ({
          ...declarations,
          [property]: `var(--${prefixes.cssVariable}-${property}, var(--${prefixes.cssVariable}-${variantKebab}-${property}))`,
        }),
        {} as CSSProperties,
      ),
    ]);
  }

  return rules;
};
