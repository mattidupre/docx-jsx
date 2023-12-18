import { simpleCssToString } from '../utils/css.js';
import type { SimpleCss } from '../utils/css.js';
import { getValueOf } from '../utils/object.js';
import {
  objectToCssVars,
  cssVarKey,
  cssVarProperty,
} from '../utils/cssVars.js';
import {
  INTRINSIC_TEXT_OPTIONS,
  INTRINSIC_TAG_NAMES_BY_VARIANT,
  type PrefixesConfig,
  type VariantsOptions,
  type VariantName,
  type ContentElementOptions,
} from '../entities';

type BaseOptions = {
  prefixes: PrefixesConfig;
  variants: VariantsOptions;
};

export const variantNameToClassName = <
  TVariantName extends undefined | VariantName,
>(
  { prefixes }: Pick<BaseOptions, 'prefixes'>,
  variantName: TVariantName,
): TVariantName extends undefined ? undefined | string : string =>
  variantName && `${prefixes.variantClassName}${variantName}`;

export const optionsToCssVars = (
  { prefixes }: Pick<BaseOptions, 'prefixes'>,
  options: ContentElementOptions,
) => {
  return objectToCssVars(options, prefixes.cssVariable);
};

// TODO: mapObjectToDeclarations(obj: {}, (value, key) => CSSAttributes):
// CSSAttributes;

export const createOptionsDeclarations = <
  TKeys extends keyof ContentElementOptions,
>(
  { prefixes }: Pick<BaseOptions, 'prefixes'>,
  optionsKeys: ReadonlyArray<TKeys>,
  defaultValues: Partial<Pick<ContentElementOptions, TKeys>> = {},
) =>
  Object.fromEntries(
    optionsKeys.map((optionsKey) => [
      optionsKey,
      cssVarProperty(
        cssVarKey(prefixes.cssVariable, optionsKey),
        defaultValues[optionsKey],
      ),
    ]),
  );

const createIntrinsics = ({
  prefixes,
}: Pick<BaseOptions, 'prefixes'>): SimpleCss => ({
  '*': {
    ...createOptionsDeclarations({ prefixes }, ['color', 'breakInside']),
  },
  ':where(a)': {
    color: 'inherit',
  },
  ':where(b, em, strong, s, u)': {
    fontWeight: 'normal',
    textDecoration: 'none',
    fontStyle: 'normal',
  },
  ':where(h1, h2, h3, h4, h5, h6, p)': {
    ...createOptionsDeclarations({ prefixes }, ['lineHeight', 'textAlign'], {
      lineHeight: '1',
    }),
    marginBlockStart: '0',
    marginBlockEnd: '0',
  },
  ':where(h1, h2, h3, h4, h5, h6, p, a, b, em, strong, s, u, span)': {
    // TODO: Remove all cssVarProperty
    fontWeight: cssVarProperty(
      cssVarKey(prefixes.cssVariable, 'fontWeight'),
      1,
    ),
    fontStyle: cssVarProperty(cssVarKey(prefixes.cssVariable, 'fontStyle')),
    fontSize: cssVarProperty(
      cssVarKey(prefixes.cssVariable, 'fontSize'),
      '1rem',
    ),
    textTransform: cssVarProperty(
      cssVarKey(prefixes.cssVariable, 'textTransform'),
    ),
    textDecoration: cssVarProperty(
      cssVarKey(prefixes.cssVariable, 'textDecoration'),
    ),
  },
  ...Object.fromEntries(
    Object.entries(INTRINSIC_TEXT_OPTIONS).map(([tagName, options]) => {
      return [tagName, optionsToCssVars({ prefixes }, options)];
    }),
  ),
});

const createVariants = ({ prefixes, variants }: BaseOptions): SimpleCss =>
  Object.fromEntries(
    Object.entries(variants).map(([variantName, variant]) => {
      let selector = `.${variantNameToClassName({ prefixes }, variantName)}`;
      const intrinsicTagName = getValueOf(
        variantName,
        INTRINSIC_TAG_NAMES_BY_VARIANT,
      );
      if (intrinsicTagName) {
        selector += `, ${intrinsicTagName}`;
      }
      return [
        [selector],
        optionsToCssVars(
          { prefixes },
          { ...variant.text, ...variant.paragraph },
        ),
      ];
    }),
  );

export const variantsToSimpleCss = (options: BaseOptions): SimpleCss => ({
  ...createIntrinsics(options),
  ...createVariants(options),
});

export const variantsToCss = (options: BaseOptions): string =>
  simpleCssToString(variantsToSimpleCss(options));
