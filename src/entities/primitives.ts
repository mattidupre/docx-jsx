import { type UnitsNumber } from 'src/utils/units';
import { merge } from 'lodash';

export const ID_PREFIX: Lowercase<string> = 'matti-docs';

export const APP_NAME = 'Matti Docs';

export type CounterType = (typeof COUNTER_TYPES)[number];

export const COUNTER_TYPES = ['page-number', 'page-count'] as const;

export type Size = {
  width: UnitsNumber;
  height: UnitsNumber;
};

export type Margin = {
  top: UnitsNumber;
  right: UnitsNumber;
  bottom: UnitsNumber;
  left: UnitsNumber;
};

export type PageMargin = Margin & {
  header: UnitsNumber;
  footer: UnitsNumber;
};

export type Layout<TElement> = {
  header: false | TElement;
  footer: false | TElement;
};

export type LayoutPartial<TElement> = {
  header?: false | TElement;
  footer?: false | TElement;
};

export type LayoutTypeMerged = (typeof LAYOUT_TYPES_MERGED)[number];

export const LAYOUT_TYPES_MERGED = ['first', 'left', 'right'] as const;

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const LAYOUT_TYPES = ['default', ...LAYOUT_TYPES_MERGED] as const;

export type LayoutsPartial<TElement> = Partial<
  Record<LayoutType, LayoutPartial<TElement>>
>;

export type LayoutsMerged<TElement> = Record<
  LayoutTypeMerged,
  Layout<TElement>
>;

const BASE_LAYOUT: Layout<unknown> = {
  header: false,
  footer: false,
} satisfies Layout<unknown>;

export const mergeLayouts = <TElement>(
  layoutsArgs: ReadonlyArray<undefined | LayoutsPartial<TElement>>,
): LayoutsMerged<TElement> => {
  const layoutsArrays = layoutsArgs.reduce<
    Record<LayoutType, Array<LayoutPartial<TElement>>>
  >(
    (obj, layouts) => {
      for (const layoutType of LAYOUT_TYPES) {
        if (layouts?.[layoutType]) {
          obj[layoutType].push(layouts[layoutType]!);
        }
      }
      return obj;
    },
    {
      default: [],
      first: [],
      left: [],
      right: [],
    },
  );
  const baseLayout = merge(
    BASE_LAYOUT,
    ...layoutsArrays.default,
  ) as Layout<TElement>;
  return {
    first: merge({}, baseLayout, ...layoutsArrays.first),
    left: merge({}, baseLayout, ...layoutsArrays.left),
    right: merge({}, baseLayout, ...layoutsArrays.right),
  };
};
