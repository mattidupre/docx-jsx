import { type RequiredDeep, type PartialDeep } from 'type-fest';
import { type UnitsNumber } from 'src/utils';
import { merge } from 'lodash';

export type PageSize = {
  width: UnitsNumber;
  height: UnitsNumber;
};

export const DEFAULT_PAGE_SIZE: PageSize = {
  width: '8.5in',
  height: '11in',
};

export type PageMargins = {
  marginTop: UnitsNumber;
  marginRight: UnitsNumber;
  marginBottom: UnitsNumber;
  marginLeft: UnitsNumber;
};

export const DEFAULT_PAGE_MARGINS: Required<PageMargins> = {
  marginTop: '0.5in',
  marginRight: '0.5in',
  marginBottom: '0.5in',
  marginLeft: '0.5in',
};

export const PAGE_TYPES = ['default', 'first', 'even', 'odd'] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export const mapPageTypes = <TValue>(
  callback: (pageType: PageType) => TValue,
) =>
  Object.fromEntries(
    PAGE_TYPES.map((pageType) => [pageType, callback(pageType)]),
  ) as Record<PageType, TValue>;

export type TextOptions = Record<string, never>;

export const extendValuesByPageType = <TValue extends Record<string, unknown>>(
  baseValue: TValue,
  pageTypes: PartialDeep<Record<PageType, TValue>> = {},
): Record<PageType, TValue> => {
  const defaultValue = merge({}, baseValue, pageTypes.default);
  const oddValue = merge({}, defaultValue, pageTypes.odd);
  const firstValue = merge({}, oddValue, pageTypes.first);
  const evenValue = merge({}, defaultValue, pageTypes.even);
  return {
    default: defaultValue,
    first: firstValue,
    even: evenValue,
    odd: oddValue,
  };
};
