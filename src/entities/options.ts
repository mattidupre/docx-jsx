import { isObject, map } from 'lodash';
import { toLowercase } from '../utils/string';
import { assignDefined, mergeWithDefault } from '../utils/object';
import { pluckFromArray } from '../utils/array';
import type { DataAttributes } from '../utils/dataAttributes';
import { type Variants, assignVariants } from './typography';
import type { FontsConfig } from './fonts';
import type { FragmentationOption } from './fragmentation';
import type { UnitsSize } from './units';

export const APP_NAME = 'Matti Docs';

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const DEFAULT_PREFIX: Lowercase<string> = PACKAGE_NAME;

export type StyleSheetsValue =
  | undefined
  | string
  | CSSStyleSheet
  | URL
  | HTMLStyleElement;

export type PrefixesConfig = {
  elementClassName: Lowercase<string>;
  variantClassName: Lowercase<string>;
  cssVariable: Lowercase<string>;
};

export type PrefixesOptions = string | Partial<PrefixesConfig>;

const PREFIX_KEYS = [
  'elementClassName',
  'variantClassName',
  'cssVariable',
] as const satisfies ReadonlyArray<keyof PrefixesConfig>;

const parsePrefixes = (prefixOptions?: PrefixesOptions): PrefixesConfig => {
  const defaultPrefix = toLowercase(
    typeof prefixOptions === 'string' ? prefixOptions : DEFAULT_PREFIX,
  );

  const prefixOptionsObject: PrefixesOptions =
    typeof prefixOptions === 'object' ? prefixOptions : {};

  return {
    elementClassName: toLowercase(
      prefixOptionsObject.elementClassName ?? defaultPrefix + '-element',
    ),
    variantClassName: toLowercase(
      prefixOptionsObject.variantClassName ?? defaultPrefix + '-variant',
    ),
    cssVariable: toLowercase(prefixOptionsObject.cssVariable ?? defaultPrefix),
  };
};

/**
 * A string shorthand names all three prefixes; an object only overrides the
 * keys it defines, so a later partial never resets an earlier one back to the
 * default prefix.
 */
const parsePrefixesOverrides = (
  prefixOptions?: PrefixesOptions,
): Partial<PrefixesConfig> => {
  if (prefixOptions === undefined) {
    return {};
  }
  if (typeof prefixOptions === 'string') {
    return parsePrefixes(prefixOptions);
  }
  return PREFIX_KEYS.reduce<Partial<PrefixesConfig>>((overrides, key) => {
    const value = prefixOptions[key];
    if (value !== undefined) {
      overrides[key] = toLowercase(value);
    }
    return overrides;
  }, {});
};

/**
 * A string argument is a shorthand, not an object, so it cannot be deep merged:
 * `mergeWithDefault` would hand the raw string straight back.
 */
export const assignPrefixesOptions = (
  ...args: ReadonlyArray<undefined | PrefixesOptions>
): PrefixesConfig =>
  args.reduce<PrefixesConfig>(
    (config, prefixOptions) =>
      assignDefined(config, parsePrefixesOverrides(prefixOptions)),
    parsePrefixes(),
  );

export const DOCUMENT_TYPES = ['web', 'docx', 'pdf'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type Color = string;

export type PageSize = {
  width: UnitsSize;
  height: UnitsSize;
};

const DEFAULT_PAGE_SIZE: PageSize = {
  width: '8.5in',
  height: '11in',
};

export type PageMargin = {
  top: UnitsSize;
  right: UnitsSize;
  bottom: UnitsSize;
  left: UnitsSize;
  header: UnitsSize;
  footer: UnitsSize;
};

const DEFAULT_PAGE_MARGIN: PageMargin = {
  header: '0.25in',
  top: '0.5in',
  right: '0.5in',
  bottom: '0.5in',
  footer: '0.25in',
  left: '0.5in',
};

export type Layout<TContent> = {
  header: undefined | TContent;
  footer: undefined | TContent;
};

export const LAYOUT_TYPES = [
  'first',
  'subsequent',
] as const satisfies ReadonlyArray<keyof LayoutConfig<unknown>>;

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export type LayoutOptions<TContent> = {
  first: Partial<Layout<TContent>>;
  subsequent: Partial<Layout<TContent>>;
};

export type LayoutConfig<TContent> = {
  first: Layout<TContent>;
  subsequent: Layout<TContent>;
};

export const mapLayoutKeys = <TContentOutput>(
  callback: (
    layoutType: LayoutType,
    elementType: keyof Layout<unknown>,
  ) => TContentOutput,
) => {
  let elementsSet = new Set<unknown>();
  return LAYOUT_TYPES.reduce(
    (layouts, layoutType) => ({
      ...layouts,
      [layoutType]: (
        ['header', 'footer'] as const satisfies ReadonlyArray<
          keyof Layout<unknown>
        >
      ).reduce((layout, elementType) => {
        const element = callback(layoutType, elementType);
        if (isObject(element)) {
          if (elementsSet.has(element)) {
            throw new TypeError('All layout elements must be unique.');
          }
          elementsSet.add(element);
        }
        return assignDefined(layout, { [elementType]: element });
      }, {}),
    }),
    {} as LayoutConfig<TContentOutput>,
  );
};

export const createDefaultLayoutConfig = <TContent>() =>
  mapLayoutKeys(() => undefined) as LayoutConfig<TContent>;

/**
 * Assigns every layout slot onto the first argument, later arguments winning,
 * and returns it. The target is mutated on purpose: `mapHtmlToDocument`
 * accumulates one header or footer at a time into a config it keeps a reference
 * to and discards the return value.
 *
 * A lone argument is still normalised. With nothing to assign onto it the
 * reduce would hand back exactly what it was given -- a `Partial<LayoutOptions>`
 * missing every slot it did not declare -- so an empty pass runs in that case
 * and fills the rest with `undefined`.
 */
export const assignLayoutOptions = <TContent>(
  ...[args0, ...args]: ReadonlyArray<
    undefined | Partial<LayoutOptions<TContent>>
  >
) =>
  (args.length > 0 ? args : [undefined]).reduce(
    (targetLayouts, thisLayouts) =>
      assignDefined(
        targetLayouts!,
        mapLayoutKeys(
          (layoutType, elementType) =>
            thisLayouts?.[layoutType]?.[elementType] ??
            targetLayouts?.[layoutType]?.[elementType],
        ),
      ),
    args0 ?? createDefaultLayoutConfig(),
  ) as LayoutConfig<TContent>;

export type DocumentOptions = {
  size?: PageSize;
  variants?: Variants;
  prefixes?: PrefixesOptions;
  fonts?: FontsConfig;
  /**
   * The conventions the DOM and PDF targets break pages by: `word` (the
   * default) or `css`, or rules over either.
   */
  fragmentation?: FragmentationOption;
};

export type DocumentConfig = {
  size: PageSize;
  variants: Variants;
  prefixes: PrefixesConfig;
  /**
   * Optional, unlike the rest of the config: an empty object is still a font
   * configuration, so a document that declares no fonts has to carry nothing
   * rather than carry `{}` into every target.
   */
  fonts?: FontsConfig;
  /** Optional, like `fonts`: a document that chooses none carries nothing. */
  fragmentation?: FragmentationOption;
};

/**
 * The last declared choice wins, as for every other document option. The
 * result is spread into the config, so a document that makes no choice has
 * no `fragmentation` key.
 */
const assignFragmentation = (
  ...args: ReadonlyArray<undefined | FragmentationOption>
): Pick<DocumentConfig, 'fragmentation'> | Record<string, never> => {
  const fragmentation = args.findLast((value) => value !== undefined);
  return fragmentation === undefined ? {} : { fragmentation };
};

/**
 * Later declarations win per font family, which is how every other document
 * option is assigned. The result is spread into the config, so a document that
 * declares no fonts is given no `fonts` key rather than an empty one.
 */
const assignFonts = (
  ...args: ReadonlyArray<undefined | FontsConfig>
): Pick<DocumentConfig, 'fonts'> | Record<string, never> => {
  const fonts = args.reduce<undefined | FontsConfig>(
    (theseFonts, nextFonts) =>
      nextFonts ? { ...theseFonts, ...nextFonts } : theseFonts,
    undefined,
  );
  return fonts ? { fonts } : {};
};

export const assignDocumentOptions = (
  ...args: ReadonlyArray<undefined | DocumentOptions>
): DocumentConfig =>
  assignDefined((args[0] ?? {}) as DocumentConfig, {
    size: mergeWithDefault(DEFAULT_PAGE_SIZE, ...pluckFromArray(args, 'size')),
    variants: assignVariants(args[0]?.variants, ...map(args, 'variants')),
    prefixes: assignPrefixesOptions(...pluckFromArray(args, 'prefixes')),
    // Spread conditionally so a document with no fonts has no `fonts` key at
    // all, rather than one holding `undefined`.
    ...assignFonts(...pluckFromArray(args, 'fonts')),
    ...assignFragmentation(...pluckFromArray(args, 'fragmentation')),
  });

type ColumnCount = 1 | 2 | 3 | 4;

export type StackOptions = {
  innerPageClassName?: string;
  outerPageClassName?: string;
  margin?: Partial<PageMargin>;
  outerPageDataAttributes?: DataAttributes;
  innerPageDataAttributes?: DataAttributes;
  continuous?: boolean;
  columns?: {
    columnCount: ColumnCount;
    columnGap: UnitsSize;
  };
};

export type StackConfig = {
  innerPageClassName?: string;
  outerPageClassName?: string;
  outerPageDataAttributes?: DataAttributes;
  innerPageDataAttributes?: DataAttributes;
  margin: PageMargin;
  continuous: boolean;
  columns: {
    columnCount: ColumnCount;
    columnGap: UnitsSize;
  };
};

export const assignStackOptions = (
  ...args: ReadonlyArray<undefined | StackOptions>
): StackConfig =>
  mergeWithDefault(
    {
      margin: DEFAULT_PAGE_MARGIN,
      continuous: false,
      columns: { columnCount: 1, columnGap: '0.5in' },
    },
    ...args,
  );
