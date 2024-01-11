import { isObject, map } from 'lodash';
import { toLowercase } from '../utils/string';
import { assignDefined, mergeWithDefault } from '../utils/object';
import type { UnitsNumber } from '../utils/units';
import { pluckFromArray } from '../utils/array';
import { type Variants, assignVariants } from './typography';

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

export const assignPrefixesOptions = (
  ...args: ReadonlyArray<undefined | PrefixesOptions>
): PrefixesConfig => mergeWithDefault(parsePrefixes(), ...args);

export type DocumentType = 'web' | 'docx' | 'pdf';

export type Color = Lowercase<`#${string}`>;

export type PageSize = {
  width: UnitsNumber;
  height: UnitsNumber;
};

const DEFAULT_PAGE_SIZE: PageSize = {
  width: '8.5in',
  height: '11in',
};

export type PageMargin = {
  top: UnitsNumber;
  right: UnitsNumber;
  bottom: UnitsNumber;
  left: UnitsNumber;
  header: UnitsNumber;
  footer: UnitsNumber;
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

export const assignLayoutOptions = <TContent>(
  ...[args0, ...args]: ReadonlyArray<
    undefined | Partial<LayoutOptions<TContent>>
  >
) =>
  args.reduce(
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
};

export type DocumentConfig = {
  size: PageSize;
  variants: Variants;
  prefixes: PrefixesConfig;
};

export const assignDocumentOptions = (
  ...args: ReadonlyArray<undefined | DocumentOptions>
): DocumentConfig =>
  assignDefined((args[0] ?? {}) as DocumentConfig, {
    size: mergeWithDefault(DEFAULT_PAGE_SIZE, ...pluckFromArray(args, 'size')),
    variants: assignVariants(args[0]?.variants, ...map(args, 'variants')),
    prefixes: assignPrefixesOptions(...pluckFromArray(args, 'prefixes')),
  });

export type StackOptions = {
  innerPageClassName?: string;
  outerPageClassName?: string;
  margin?: Partial<PageMargin>;
  continuous?: boolean;
};

export type StackConfig = {
  innerPageClassName?: string;
  outerPageClassName?: string;
  margin: PageMargin;
  continuous: boolean;
};

export const assignStackOptions = (
  ...args: ReadonlyArray<undefined | StackOptions>
): StackConfig =>
  mergeWithDefault({ margin: DEFAULT_PAGE_MARGIN, continuous: false }, ...args);
