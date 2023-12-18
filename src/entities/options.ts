import { isObject, toLower, map } from 'lodash-es';
import { mergeWithDefault } from '../utils/object.js';
import type { UnitsNumber } from '../utils/units.js';
import { objectToCssVars } from '../utils/cssVars.js';
import { pluckFromArray } from '../utils/array.js';
import type { TagName } from './html.js';

const toLowercase = <T extends string>(string: T) =>
  toLower(string) as Lowercase<T>;

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const ID_PREFIX: Lowercase<string> = PACKAGE_NAME;

const PREFIX_TYPES = [
  'variantClassName',
  'cssVariable',
  'dataAttribute',
] as const;

type PrefixType = (typeof PREFIX_TYPES)[number];

export type PrefixesConfig = Record<PrefixType, Lowercase<string>>;

export type PrefixesOptions = string | Partial<PrefixesConfig>;

const parsePrefixes = (prefixOptions?: PrefixesOptions): PrefixesConfig => {
  const defaultPrefix = toLowercase(
    typeof prefixOptions === 'string' ? prefixOptions : `${ID_PREFIX}-`,
  );

  const prefixOptionsObject: PrefixesOptions =
    typeof prefixOptions === 'object' ? prefixOptions : {};

  return {
    variantClassName: toLowercase(
      prefixOptionsObject.variantClassName ?? defaultPrefix + 'variant-',
    ),
    cssVariable: toLowercase(prefixOptionsObject.cssVariable ?? defaultPrefix),
    dataAttribute: toLowercase(
      prefixOptionsObject.cssVariable ?? defaultPrefix,
    ),
  };
};

export const assignPrefixesOptions = (
  ...args: ReadonlyArray<undefined | PrefixesOptions>
): PrefixesConfig => mergeWithDefault(parsePrefixes(), ...args);

export const APP_NAME = 'Matti Docs';

export type Target = 'web' | 'docx' | 'pdf';

export const DEFAULT_TARGET = 'web' satisfies Target;

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
        return Object.assign(layout, { [elementType]: element });
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
      Object.assign(
        targetLayouts!,
        mapLayoutKeys(
          (layoutType, elementType) =>
            thisLayouts?.[layoutType]?.[elementType] ??
            targetLayouts?.[layoutType]?.[elementType],
        ),
      ),
    args0 ?? createDefaultLayoutConfig(),
  ) as LayoutConfig<TContent>;

export type Variant = {
  text: TextOptions;
  paragraph: ParagraphOptions;
};

export type VariantName = string;

export type VariantsOptions = Record<string, Partial<Variant>>;

export type VariantsConfig = Record<string, Variant>;

const DEFAULT_VARIANT: Variant = {
  text: {},
  paragraph: {},
};

const DEFAULT_VARIANTS: VariantsConfig = {
  document: { text: {}, paragraph: {} },
  title: { text: {}, paragraph: {} },
  heading1: { text: {}, paragraph: {} },
  heading2: { text: {}, paragraph: {} },
  heading3: { text: {}, paragraph: {} },
  heading4: { text: {}, paragraph: {} },
  heading5: { text: {}, paragraph: {} },
  heading6: { text: {}, paragraph: {} },
  strong: { text: {}, paragraph: {} },
  listParagraph: { text: {}, paragraph: {} },
  hyperlink: { text: {}, paragraph: {} },
};

export type IntrinsicVariantNames = keyof typeof DEFAULT_VARIANTS;

export const INTRINSIC_TAG_NAMES_BY_VARIANT = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
  heading5: 'h5',
  heading6: 'h6',
} satisfies Partial<Record<IntrinsicVariantNames, TagName>>;

export const assignVariants = (
  ...args: ReadonlyArray<undefined | Partial<VariantsOptions>>
) => {
  const arraysByVariantName: Record<
    string,
    {
      text: Array<undefined | TextOptions>;
      paragraph: Array<undefined | ParagraphOptions>;
    }
  > = {};
  for (const variants of args) {
    for (const variantName in variants) {
      arraysByVariantName[variantName] ??= { text: [], paragraph: [] };
      arraysByVariantName[variantName].text.push(variants?.[variantName]?.text);
      arraysByVariantName[variantName].paragraph.push(
        variants?.[variantName]?.paragraph,
      );
    }
  }
  const targetVariants = {} as VariantsConfig;
  for (const variantName in arraysByVariantName) {
    const targetVariant = structuredClone(
      targetVariants[variantName] ?? DEFAULT_VARIANT,
    );
    targetVariant.text = assignTextOptions(
      targetVariant.text,
      ...arraysByVariantName[variantName].text,
    );
    targetVariant.paragraph = assignParagraphOptions(
      targetVariant.paragraph,
      ...arraysByVariantName[variantName].paragraph,
    );
    Object.assign(
      (targetVariants[variantName] ??= {} as Variant),
      targetVariant,
    );
  }
  return Object.assign(args[0] ?? {}, targetVariants);
};

export type DocumentOptions = {
  size?: PageSize;
  variants?: VariantsOptions;
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
  Object.assign((args[0] ?? {}) as DocumentConfig, {
    size: mergeWithDefault(DEFAULT_PAGE_SIZE, ...pluckFromArray(args, 'size')),
    variants: assignVariants(
      args[0]?.variants,
      DEFAULT_VARIANTS,
      ...map(args, 'variants'),
    ),
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

// TODO: add false since undefined will not overwrite parent.
export type ParagraphOptions = {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: `${number}`;
};

export type ParagraphConfig = ParagraphOptions;

export const assignParagraphOptions = (
  ...args: ReadonlyArray<undefined | ParagraphOptions>
): ParagraphConfig => mergeWithDefault({}, ...args);

export const paragraphOptionsToCssVars = (
  ...args: ReadonlyArray<undefined | ParagraphOptions>
) => objectToCssVars({ paragraph: assignParagraphOptions({}, ...args) });

// TODO: add false since undefined will not overwrite parent.
export type TextOptions = {
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  fontSize?: `${number}rem`;
  color?: Color;
  highlightColor?: Color;
  textTransform?: 'uppercase';
  textDecoration?: 'underline' | 'line-through';
  superScript?: boolean;
  subScript?: boolean;
};

export type TextConfig = TextOptions;

export const assignTextOptions = (
  ...args: ReadonlyArray<undefined | TextOptions>
): TextConfig => mergeWithDefault({}, ...args);

export const textOptionsToCssVars = (
  ...args: ReadonlyArray<undefined | TextOptions>
) => objectToCssVars({ text: assignTextOptions({}, ...args) });

export const INTRINSIC_TEXT_OPTIONS = {
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  s: { textDecoration: 'line-through' },
  sup: { superScript: true },
  sub: { subScript: true },
} as const satisfies Partial<Record<TagName, TextOptions>>;

export const getIntrinsicTextOptions = (tagName: TagName): TextOptions => {
  const options =
    INTRINSIC_TEXT_OPTIONS[tagName as keyof typeof INTRINSIC_TEXT_OPTIONS];
  return options ? structuredClone(options) : {};
};

export type CounterType = (typeof COUNTER_TYPES)[number];

export const COUNTER_TYPES = ['page-number', 'page-count'] as const;

export type CounterOptions = {
  counterType: CounterType;
  text?: TextOptions;
  variant?: VariantName;
};
