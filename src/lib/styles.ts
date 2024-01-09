import { kebabCase, pick } from 'lodash';
import {
  TYPOGRAPHY_CSS_KEYS,
  type Variants,
  INTRINSIC_VARIANT_TAG_NAMES,
  type PrefixesConfig,
  type TypographyOptions,
  type VariantName,
  type FontsConfig,
} from '../entities';
import { getValueOf } from '../utils/object';
import { joinKebab, prefixKebab } from '../utils/string';
import {
  type CssRulesArray,
  cssRulesArrayToString,
  type CssRuleDeclarations,
  objectToVarValues,
} from '../utils/css';

const TYPOGRAPHY_CSS_PROPERTIES = TYPOGRAPHY_CSS_KEYS.map(kebabCase);

export const variantNameToClassName = (
  { prefixes }: { prefixes: PrefixesConfig },
  variantName: VariantName,
) => prefixKebab(prefixes.variantClassName, variantName);

export const typographyOptionsToStyleVars = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  typographyOptions: undefined | TypographyOptions,
) =>
  objectToVarValues(pick(typographyOptions, ...TYPOGRAPHY_CSS_KEYS), {
    prefix: options.prefixes.cssVariable,
  });

export const variantsToStyleVars = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  variants: Partial<Variants>,
) =>
  objectToVarValues(variants, {
    prefix: options.prefixes.cssVariable,
  });

export const createStyleArray = (options: {
  variants?: Variants;
  prefixes: Pick<PrefixesConfig, 'cssVariable' | 'variantClassName'>;
  fonts?: FontsConfig;
}): CssRulesArray => {
  const { prefixes, variants = {}, fonts = [] } = options;

  // TODO: Add @font-face rules.

  // TODO: How to handle highlight, <sup>, <sub>?
  const rules: CssRulesArray = [];

  rules.push([
    '*',
    TYPOGRAPHY_CSS_PROPERTIES.reduce(
      (declarations, property) => ({
        ...declarations,
        [property]: `var(--${joinKebab(
          prefixes.cssVariable,
          property,
        )}, revert)`,
      }),
      {} as CssRuleDeclarations,
    ),
  ]);

  // TODO: Handle with typography options.
  rules.push([
    `:where(${['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'dl'].join(
      ', ',
    )})`,
    {
      marginTop: 0,
      marginBottom: 0,
    },
  ]);

  // Variant vars are attached to variant class names .[prefix]-[variant-name]
  for (const variantName in variants) {
    const intrinsicTagName = getValueOf(
      INTRINSIC_VARIANT_TAG_NAMES,
      variantName,
    );

    const variantSelectors = [
      `:where(.${variantNameToClassName({ prefixes }, variantName)})`,
      intrinsicTagName ? `:where(${intrinsicTagName})` : [],
    ].flat();

    const variantSelectorSelf = variantSelectors.join(', ');

    rules.push([
      // Variant tags set variant CSS vars.
      variantSelectorSelf,
      typographyOptionsToStyleVars({ prefixes }, variants[variantName]),
    ]);
  }

  return rules;
};

export const createStyleString = (
  ...args: Parameters<typeof createStyleArray>
) => cssRulesArrayToString(createStyleArray(...args));
