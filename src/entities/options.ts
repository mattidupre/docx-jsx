import { isObject, mapValues } from 'lodash-es';
import { mergeWithDefault } from '../utils/mergeWithDefault.js';
import type { UnitsNumber } from '../utils/units.js';
import { optionsToCssVars } from '../utils/cssVars.js';
import type { TagName } from './html.js';

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const ID_PREFIX: Lowercase<string> = PACKAGE_NAME;

export const APP_NAME = 'Matti Docs';

export type Color = Lowercase<`#${string}`>;

export type PageSize = {
  width: UnitsNumber;
  height: UnitsNumber;
};

export type PageMargin = {
  top: UnitsNumber;
  right: UnitsNumber;
  bottom: UnitsNumber;
  left: UnitsNumber;
  header: UnitsNumber;
  footer: UnitsNumber;
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

export type DocumentOptions = {
  size?: PageSize;
};

export type DocumentConfig = Required<DocumentOptions>;

export const DEFAULT_DOCUMENT_OPTIONS: DocumentConfig = {
  size: {
    width: '8.5in',
    height: '11in',
  },
};

export const assignDocumentOptions = (
  ...args: ReadonlyArray<undefined | DocumentOptions>
): DocumentConfig => mergeWithDefault(DEFAULT_DOCUMENT_OPTIONS, ...args);

export type StackOptions = {
  pageClassName?: string;
  margin?: Partial<PageMargin>;
};

export type StackConfig = {
  pageClassName?: string;
  margin: PageMargin;
};

const DEFAULT_STACK_OPTIONS: StackConfig = {
  margin: {
    header: '0.25in',
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    footer: '0.25in',
    left: '0.5in',
  },
};

export const assignStackOptions = (
  ...args: ReadonlyArray<undefined | StackOptions>
): StackConfig => mergeWithDefault(DEFAULT_STACK_OPTIONS, ...args);

// TODO: add false since undefined will not overwrite parent.
export type ParagraphOptions = {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: `${number}`;
};

export type ParagraphConfig = ParagraphOptions;

export const assignParagraphOptions = (
  ...args: ReadonlyArray<undefined | ParagraphOptions>
): ParagraphConfig => mergeWithDefault({}, ...args);

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

const INTRINSIC_TEXT_OPTIONS = {
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  s: { textDecoration: 'line-through' },
  sup: { superScript: true },
  sub: { subScript: true },
} as const satisfies Partial<Record<TagName, TextOptions>>;

export const INTRINSIC_CSS_VARS = mapValues(INTRINSIC_TEXT_OPTIONS, (value) =>
  optionsToCssVars({ text: value }),
);

export const getIntrinsicTextOptions = (tagName: TagName): TextOptions => {
  const options =
    INTRINSIC_TEXT_OPTIONS[tagName as keyof typeof INTRINSIC_TEXT_OPTIONS];
  return options ? structuredClone(options) : {};
};

// TODO: Separate 'page-number' and 'page-count' elements with no bespoke options?

export type CounterType = (typeof COUNTER_TYPES)[number];

export const COUNTER_TYPES = ['page-number', 'page-count'] as const;

export type CounterOptions = {
  counterType: CounterType;
  text?: TextOptions;
};
