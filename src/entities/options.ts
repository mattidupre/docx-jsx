import { mergeWithDefault } from '../utils/mergeWithDefault.js';
import { type UnitsNumber } from '../utils/units.js';
import { isObject } from 'lodash-es';

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
  ...args: ReadonlyArray<DocumentOptions>
): DocumentConfig => mergeWithDefault(DEFAULT_DOCUMENT_OPTIONS, ...args);

export type StackOptions = {
  margin?: Partial<PageMargin>;
};

export type StackConfig = {
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
  ...args: ReadonlyArray<StackOptions>
): StackConfig => mergeWithDefault(DEFAULT_STACK_OPTIONS, ...args);

export type ParagraphOptions = {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
};

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

export type CounterType = (typeof COUNTER_TYPES)[number];

export const COUNTER_TYPES = ['page-number', 'page-count'] as const;

export type CounterOptions = {
  counterType: CounterType;
  text?: TextOptions;
};
