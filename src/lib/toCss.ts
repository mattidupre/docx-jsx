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
  type VariantsConfig,
  type VariantName,
  type ContentElementOptions,
} from '../entities';

type BaseOptions = {
  prefixes: PrefixesConfig;
  variants: VariantsConfig;
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
  options: ContentElementOptions = {},
) => {
  return objectToCssVars(options, prefixes.cssVariable);
};

export const optionsToStyle = <TKeys extends keyof ContentElementOptions>(
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
    ...optionsToStyle({ prefixes }, ['color', 'breakInside']),
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
    ...optionsToStyle({ prefixes }, ['lineHeight', 'textAlign'], {
      lineHeight: '1',
    }),
    marginBlockStart: '0',
    marginBlockEnd: '0',
  },
  ':where(h1, h2, h3, h4, h5, h6, p, a, b, em, strong, s, u, span)': {
    ...optionsToStyle(
      { prefixes },
      [
        'fontWeight',
        'fontStyle',
        'fontSize',
        'textTransform',
        'textDecoration',
      ],
      {
        fontSize: '1rem',
      },
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
      return [[selector], optionsToCssVars({ prefixes }, variant)];
    }),
  );

export const createEnvironmentSimpleCss = (
  options: BaseOptions,
): SimpleCss => ({
  ...createIntrinsics(options),
  ...createVariants(options),
});

export const createEnvironmentCss = (options: BaseOptions): string =>
  simpleCssToString(createEnvironmentSimpleCss(options));
