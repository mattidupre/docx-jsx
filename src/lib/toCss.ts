import type { Entries } from 'type-fest';
import { mapValues, kebabCase, mapKeys } from 'lodash';
import { simpleCssToString } from '../utils/css';
import type { SimpleCss } from '../utils/css';
import { getValueOf } from '../utils/object';
import {
  objectToCssVars,
  cssVarKey,
  cssVarProperty,
  cssProperty,
} from '../utils/cssVars';
import {
  INTRINSIC_TEXT_OPTIONS,
  INTRINSIC_TAG_NAMES_BY_VARIANT,
  type PrefixesConfig,
  type VariantsConfig,
  type VariantName,
  type ContentElementOptions,
  type VariantConfig,
} from '../entities';
import { joinArrayStrings } from '../utils/array';

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

export const createCssVarKey = (
  {
    prefixes,
    variantName,
  }: Pick<BaseOptions, 'prefixes'> & { variantName?: VariantName },
  key: string,
) => {
  return `--${prefixes.cssVariable}${kebabCase(variantName)}-${kebabCase(key)}`;
};

export const optionsToCssVars = (
  {
    prefixes,
    variantName,
  }: Pick<BaseOptions, 'prefixes'> & { variantName?: VariantName },
  options: VariantConfig = {},
) => {
  const parsedOptions = mapValues(options, (value, key) => {
    const cssVarValue =
      variantName && createCssVarKey({ prefixes, variantName }, key);
    return cssProperty(
      cssVarValue,
      ...(Array.isArray(value) ? value : [value]),
    );
  });

  return objectToCssVars(parsedOptions, {
    prefix: prefixes.cssVariable,
  });
};

export const variantsToCssVars = (
  { prefixes }: Pick<BaseOptions, 'prefixes'>,
  variants: Partial<VariantsConfig>,
) => {
  const cssVars: ReturnType<typeof optionsToCssVars> = {};
  for (const variantName in variants) {
    Object.assign(
      cssVars,
      mapKeys(variants[variantName], (value, key) =>
        createCssVarKey({ prefixes, variantName }, key),
      ),
    );
  }
  return cssVars;
};

const optionsToStyle = <TKeys extends keyof ContentElementOptions>(
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
        'fontFamily',
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
      return [`:where(${tagName})`, optionsToCssVars({ prefixes }, options)];
    }),
  ),
});

const createVariants = ({ prefixes, variants }: BaseOptions): SimpleCss => {
  return Object.fromEntries(
    Object.entries(variants).reduce((entries, [variantName, variantConfig]) => {
      const variantSelectors = [
        `.${variantNameToClassName({ prefixes }, variantName)}`,
        getValueOf(variantName, INTRINSIC_TAG_NAMES_BY_VARIANT),
      ];

      entries.push([
        joinArrayStrings(variantSelectors, ', '),
        optionsToCssVars({ prefixes }, variantConfig),
      ]);

      entries.push([
        joinArrayStrings(
          [...variantSelectors, ...variantSelectors.map((s) => s && `${s} *`)],
          ', ',
        ),
        optionsToCssVars({ prefixes, variantName }, variantConfig),
      ]);

      return entries;
    }, [] as Entries<SimpleCss>),
  );
};

export const createEnvironmentSimpleCss = (
  options: BaseOptions,
): SimpleCss => ({
  ...createIntrinsics(options),
  ...createVariants(options),
});

export const createEnvironmentCss = (options: BaseOptions): string =>
  simpleCssToString(createEnvironmentSimpleCss(options));
