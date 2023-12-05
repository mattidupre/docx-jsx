import type { ReadonlyDeep } from 'type-fest';
import { type UnitsNumber } from '../utils/units.js';
import { mapValues } from 'lodash-es';

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const ID_PREFIX: Lowercase<string> = 'matti-docs';

export const APP_NAME = 'Matti Docs';

export type TagName = keyof JSX.IntrinsicElements;

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
  header: UnitsNumber;
  footer: UnitsNumber;
};

export type Layout<TElement> = {
  header: TElement;
  footer: TElement;
};

export type LayoutPartial<TElement> = Partial<Layout<TElement>>;

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const LAYOUT_TYPES = [
  'first',
  'default',
] as const satisfies ReadonlyArray<keyof Layouts<unknown>>;

// TODO: Rename to LayoutOptions to match TextOptions, ParagraphOptions.
export type Layouts<TElement> = {
  first: false | Required<Layout<undefined | TElement>>;
  default: Required<Layout<undefined | TElement>>;
};

export type LayoutsPartial<TElement> = {
  first?: false | LayoutPartial<TElement>;
  default?: LayoutPartial<TElement>;
};

export const createDefaultLayouts = <TElement>(): Layouts<TElement> => ({
  first: {
    header: undefined,
    footer: undefined,
  },
  default: {
    header: undefined,
    footer: undefined,
  },
});

export const assignLayouts = <TElement>(
  target: LayoutsPartial<TElement>,
  ...args: ReadonlyArray<undefined | LayoutsPartial<TElement>>
) => {
  const defaultLayouts = createDefaultLayouts<TElement>();
  const keys = Object.keys(defaultLayouts) as ReadonlyArray<
    keyof Layouts<unknown>
  >;
  return [defaultLayouts, ...args].reduce((targetLayouts, thisLayouts) => {
    keys.forEach((key) => {
      if (
        key === 'first' &&
        (thisLayouts?.first === false || targetLayouts?.first === false)
      ) {
        targetLayouts!.first = false;
        return;
      }
      if (thisLayouts?.[key] === false) {
        throw new TypeError('Only the "first" layout may be false.');
      }
      if (!thisLayouts?.[key]) {
        return;
      }
      if (!targetLayouts![key]) {
        targetLayouts![key] = {};
      }
      const thisLayout = thisLayouts![key] as Layout<unknown>;
      const targetLayout = targetLayouts![key] as Layout<unknown>;
      if (thisLayout.header) {
        targetLayout.header = thisLayout.header;
      }
      if (thisLayout.footer) {
        targetLayout.footer = thisLayout.footer;
      }
    });
    return targetLayouts;
  }, target) as Layouts<TElement>;
};

export const extendLayouts = <TElement>(
  ...layoutsArgs: ReadonlyArray<undefined | LayoutsPartial<TElement>>
): Layouts<TElement> =>
  assignLayouts<TElement>(createDefaultLayouts<TElement>(), ...layoutsArgs);
