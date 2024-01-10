import { kebabCase, mapValues, pick } from 'lodash';
import {
  TYPOGRAPHY_CSS_KEYS,
  type Variants,
  INTRINSIC_VARIANT_TAG_NAMES,
  type PrefixesConfig,
  type TypographyOptions,
  type VariantName,
  type FontsConfig,
  PARAGRAPH_TAG_NAMES,
} from '../entities';
import { getValueOf } from '../utils/object';
import { joinKebab, prefixKebab } from '../utils/string';
import {
  type CssRulesArray,
  cssRulesArrayToString,
  type CssRuleDeclarations,
  objectToVarValues,
} from '../utils/css';

// export const elementTypeToClassName = (
//   { prefixes }: { prefixes: Pick<PrefixesConfig, 'elementClassName'> },
//   elementType: ElementType,
// ) => prefixKebab(prefixes.elementClassName, elementType);

export const variantNameToClassName = (
  { prefixes }: { prefixes: Pick<PrefixesConfig, 'variantClassName'> },
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

const createPrefixedVar = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  value: string | number,
  defaultValue?: string | number,
) =>
  `var(--${joinKebab(options.prefixes.cssVariable, String(value))}${
    defaultValue !== undefined ? `, ${defaultValue}` : ''
  })`;

const DEFAULT_VARS: CssRuleDeclarations = {
  fontSize: '1rem',
  borderWidth: 0,
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
};

const DIRECT_PARAGRAPH_STYLES = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
} as const satisfies Partial<Record<keyof TypographyOptions, unknown>>;

export const createStyleArray = (options: {
  variants?: Variants;
  prefixes: Pick<PrefixesConfig, 'cssVariable' | 'variantClassName'>;
  // fonts?: FontsConfig;
}): CssRulesArray => {
  const { prefixes, variants = {} } = options;

  // TODO: Add @font-face rules.

  // TODO: How to handle highlight, <sup>, <sub>?
  const rules: CssRulesArray = [];

  rules.push([
    '*',
    {
      borderWidth: 0,
      borderStyle: 'solid',
      ...TYPOGRAPHY_CSS_KEYS.reduce((declarations, property) => {
        if (property in DIRECT_PARAGRAPH_STYLES) {
          return declarations;
        }
        return {
          ...declarations,
          [kebabCase(property)]: createPrefixedVar(
            options,
            property,
            DEFAULT_VARS[property] ?? 'unset',
          ),
        };
      }, {} as CssRuleDeclarations),
    },
  ]);

  rules.push(
    [
      ':where(b, strong)',
      {
        fontWeight: 'bold',
      },
    ],
    [
      ':where(em, i)',
      {
        fontStyle: 'italic',
      },
    ],
    [
      ':where(u)',
      {
        textDecoration: 'underline',
      },
    ],
    [
      ':where(s)',
      {
        textDecoration: 'line-through',
      },
    ],
  );

  rules.push(
    [
      `:where(${PARAGRAPH_TAG_NAMES.join(', ')})`,
      {
        ...mapValues(DIRECT_PARAGRAPH_STYLES, (value, key) =>
          createPrefixedVar(options, key, value),
        ),
        display: 'flow-root', // Prevents margin collapse
      },
    ],
    [
      `:where(li)`,
      {
        display: 'list-item', // Fixes flow-root
      },
    ],
  );

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
