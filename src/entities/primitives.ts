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

export type LayoutPartial<TElement> = {
  header?: TElement;
  footer?: TElement;
};

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const LAYOUT_TYPES = ['first', 'left', 'right'] as const;

export type LayoutsPartial<TElement> = {
  first?: false | LayoutPartial<TElement>;
  left?: LayoutPartial<TElement>;
  right?: LayoutPartial<TElement>;
};

export const checkLayouts = (layouts: undefined | LayoutsPartial<unknown>) => {
  if (!layouts) {
    return;
  }
  if ((!layouts.left && layouts.right) || (layouts.left && !layouts.right)) {
    console.warn(
      'Providing only one left or right layout will cause layout problems.',
    );
  }
};
