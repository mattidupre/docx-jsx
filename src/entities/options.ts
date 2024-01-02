import { isObject, map, merge } from 'lodash';
import { toLowercase } from '../utils/string';
import { assignDefined, mergeWithDefault } from '../utils/object';
import type { UnitsNumber } from '../utils/units';
import { pluckFromArray } from '../utils/array';
import type { TagName } from './html';

export const APP_NAME = 'Matti Docs';

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const DEFAULT_PREFIX: Lowercase<string> = PACKAGE_NAME;

export type StyleSheetsValue =
  | undefined
  | string
  | CSSStyleSheet
  | HTMLStyleElement;

export type PrefixesConfig = {
  variantClassName: Lowercase<string>;
  cssVariable: Lowercase<string>;
};

export type PrefixesOptions = string | Partial<PrefixesConfig>;

const parsePrefixes = (prefixOptions?: PrefixesOptions): PrefixesConfig => {
  const defaultPrefix = toLowercase(
    typeof prefixOptions === 'string' ? prefixOptions : `${DEFAULT_PREFIX}-`,
  );

  const prefixOptionsObject: PrefixesOptions =
    typeof prefixOptions === 'object' ? prefixOptions : {};

  return {
    variantClassName: toLowercase(
      prefixOptionsObject.variantClassName ?? defaultPrefix + 'variant-',
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

export type VariantConfig = ContentOptions;

export type VariantName = string;

export type VariantsConfig = Record<string, VariantConfig>;

const INTRINSIC_VARIANT_NAMES = [
  'document',
  'title',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'strong',
  'listParagraph',
  'hyperlink',
] as const satisfies ReadonlyArray<keyof VariantsConfig>;

export type IntrinsicVariantName = (typeof INTRINSIC_VARIANT_NAMES)[number];

export const INTRINSIC_TAG_NAMES_BY_VARIANT = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
  heading5: 'h5',
  heading6: 'h6',
} satisfies Partial<Record<IntrinsicVariantName, TagName>>;

export const assignVariants = <T extends VariantsConfig = VariantsConfig>(
  ...args: ReadonlyArray<undefined | Partial<T>>
): T => merge((args[0] ?? {}) as T, ...args.filter((v) => v !== undefined));

export type DocumentOptions = {
  size?: PageSize;
  variants?: VariantsConfig;
  prefixes?: PrefixesOptions;
};

export type DocumentConfig = {
  size: PageSize;
  variants: VariantsConfig;
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
};

export type StackConfig = {
  innerPageClassName?: string;
  outerPageClassName?: string;
  margin: PageMargin;
};

export const assignStackOptions = (
  ...args: ReadonlyArray<undefined | StackOptions>
): StackConfig => mergeWithDefault({ margin: DEFAULT_PAGE_MARGIN }, ...args);

export type ContentConfig = Partial<{
  breakInside: 'avoid';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: `${number}`;
  fontWeight: 'bold';
  fontStyle: 'italic';
  fontSize: `${number}rem`;
  fontFamily: string;
  color: Color;
  highlightColor: Color;
  textTransform: 'uppercase';
  textDecoration: 'underline' | 'line-through';
  superScript: boolean;
  subScript: boolean;
}>;

export type ContentOptions = {
  [K in keyof ContentConfig]:
    | undefined
    // | false // TODO: Use to overwrite option? default / inherited?
    | ContentConfig[K]
    | [...ReadonlyArray<undefined | `--${string}`>, ContentConfig[K]];
};

export const assignContentOptions = (
  ...[args0, ...args]: ReadonlyArray<undefined | ContentOptions>
) => assignDefined(args0 ?? {}, ...args) as ContentOptions;

export const PARAGRAPH_OPTIONS_KEYS = [
  'textAlign',
  'lineHeight',
] as const satisfies ReadonlyArray<keyof ContentOptions>;

export type ContentParagraphOptions = Pick<
  ContentOptions,
  (typeof PARAGRAPH_OPTIONS_KEYS)[number]
>;

const TEXT_OPTIONS_KEYS = [
  'fontWeight',
  'fontStyle',
  'fontSize',
  'fontFamily',
  'color',
  'highlightColor',
  'textTransform',
  'textDecoration',
  'superScript',
  'subScript',
] as const satisfies ReadonlyArray<keyof ContentOptions>;

export type ContentTextOptions = Pick<
  ContentOptions,
  (typeof TEXT_OPTIONS_KEYS)[number]
>;

export const INTRINSIC_TEXT_OPTIONS = {
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  s: { textDecoration: 'line-through' },
  sup: { superScript: true },
  sub: { subScript: true },
} as const satisfies Partial<Record<TagName, ContentTextOptions>>;
