import { type UnitsNumber } from 'src/utils';

export const PAGE_TYPES = ['default', 'even', 'odd', 'first'] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export function assertPageType(value: any): asserts value is PageType {
  if (!PAGE_TYPES.includes(value)) {
    throw new TypeError(`Invalid Page Type "${value}".`);
  }
}

export const mapPageTypes = <
  TSourceObj extends Partial<Record<PageType, any>>,
  TReturn,
>(
  obj: TSourceObj,
  fn: <TPageType extends PageType>(
    pageType: TPageType,
    value: TSourceObj[TPageType],
  ) => TReturn,
) =>
  Object.fromEntries(
    PAGE_TYPES.map((pageType) => [pageType, fn(pageType, obj[pageType])]),
  ) as Record<PageType, TReturn>;

export type PageOptions = {
  width: UnitsNumber;
  height: UnitsNumber;
  marginTop: UnitsNumber;
  marginRight: UnitsNumber;
  marginBottom: UnitsNumber;
  marginLeft: UnitsNumber;
  headerHtml: false | string;
  footerHtml: false | string;
};

const DEFAULT_PAGE_OPTIONS: PageOptions = {
  width: '8.5in',
  height: '11in',
  marginTop: '0.5in',
  marginRight: '0.5in',
  marginBottom: '0.5in',
  marginLeft: '0.5in',
  headerHtml: false,
  footerHtml: false,
};

const PAGE_OPTIONS_KEYS = Object.keys(DEFAULT_PAGE_OPTIONS) as ReadonlyArray<
  keyof PageOptions
>;

const extendPageOptions = (
  ...optionsObjects: Array<undefined | Partial<PageOptions>>
) => {
  optionsObjects.reverse();
  return Object.fromEntries(
    PAGE_OPTIONS_KEYS.map((key) => [
      key,
      optionsObjects.find(
        (obj) => obj?.[key] && obj[key] !== false && obj[key] !== null,
      )?.[key],
    ]),
  ) as PageOptions;
};

type PageTypesOptions = Partial<Record<PageType, Partial<PageOptions>>>;

export const parsePageTypes = (pageTypes: PageTypesOptions = {}) => {
  const defaultOptions = extendPageOptions(
    DEFAULT_PAGE_OPTIONS,
    pageTypes.default,
  );
  return Object.fromEntries(
    PAGE_TYPES.map((pageType) => [
      pageType,
      pageType === 'default'
        ? defaultOptions
        : extendPageOptions(defaultOptions, pageTypes[pageType]),
    ]),
  ) as Record<PageType, PageOptions>;
};

export type PagesGroupOptions = {
  contentHtml: string;
  id: string;
  pageTypes?: PageTypesOptions;
};
