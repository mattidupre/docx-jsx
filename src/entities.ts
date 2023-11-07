type DocElementType =
  | 'root'
  | 'document'
  | 'pagegroup'
  | 'header'
  | 'footer'
  | 'paragraph'
  | 'textrun'
  | 'text';

export type ReactAst = {
  type: 'element' | 'text' | 'root';
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: ReadonlyArray<ReactAst>;
  elementType: DocElementType;
  elementData?: { elementType: DocElementType } & Record<string, unknown>;
  value?: string;
};

export const ID_PREFIX: Lowercase<string> = 'matti-docs';
export const HTML_TYPE_ATTRIBUTE = `data-${ID_PREFIX}-type`;
export const HTML_DATA_ATTRIBUTE = `data-${ID_PREFIX}-data`;
export const encodeHtmlDataAttributes = (
  data: Record<string, any> & { elementType: string },
) => ({
  [HTML_TYPE_ATTRIBUTE]: data.elementType,
  [HTML_DATA_ATTRIBUTE]: encodeURI(JSON.stringify(data)),
});
const AST_DATA_ATTRIBUTE = HTML_DATA_ATTRIBUTE.replace(
  /\-[a-z]/g,
  (char) => `${char[1].toUpperCase()}`,
);
export const decodeAstDataAttributes = (elAttributes: any) =>
  elAttributes?.[AST_DATA_ATTRIBUTE] &&
  JSON.parse(decodeURI(elAttributes[AST_DATA_ATTRIBUTE]));

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

export const DEFAULT_PAGE_OPTIONS: PageOptions = {
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

export type PageTypesOptions = Partial<Record<PageType, Partial<PageOptions>>>;

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

export type DocumentOptions = {
  pageGroups: ReadonlyArray<PagesGroupOptions>;
};
