import { intersection, mapValues } from 'lodash';
import type { JsonValue } from 'type-fest';
import {
  decodeDataAttributeValue,
  encodeDataAttributeValue,
} from '../utils/dataAttributes';
import { ELEMENT_DATA_ATTRIBUTES } from './documentNames';
import type {
  DocumentConfig,
  LayoutType,
  StackConfig,
  LayoutConfig,
  Color,
} from './options';
import type { TagName } from './html';
import type { TypographyOptions, VariantName } from './typography';
import type { UnitsSize } from './units';

export type ConfigByElementType = {
  document: DocumentConfig;
  stack: StackConfig;
  header: { layoutType: LayoutType };
  content: Record<string, never>;
  footer: { layoutType: LayoutType };
  htmltag: TypographyOptions & {
    variant?: VariantName;
  };
  htmlraw: Record<string, never>;
  break: Record<string, never>;
  pagenumber: Record<string, never>;
  pagecount: Record<string, never>;
  split: Record<string, never>;
  positionalTab: { alignment: 'left' | 'right' | 'center' };
  gridContainer: { columnGap: UnitsSize; columnCount: number };
  gridItem: {
    size: number;
  };
  image: {
    src: string;
    width?: UnitsSize;
    height?: UnitsSize;
    alt: string;
    align?: 'left' | 'center' | 'right';
  };
  divider: {
    color: Color;
    thickness: UnitsSize;
    spaceBefore: UnitsSize;
    spaceAfter: UnitsSize;
    /** Percentage of the content width the rule spans. */
    width?: number;
  };
  spacer: { height: UnitsSize };
  list: {
    ordered: boolean;
    format: ListFormat;
    start: number;
    indent: undefined | UnitsSize;
  };
  table: {
    /**
     * Absolute column widths, or unitless weights that share the table width
     * between the columns. Left out, the columns size themselves to their
     * content in both targets.
     */
    columnWidths?: ReadonlyArray<UnitsSize> | ReadonlyArray<number>;
    /** A number is a percentage of the content width, a length is absolute. */
    width: number | UnitsSize;
    borders: false | TableBordersConfig;
    cellPadding: UnitsSize;
    align?: TableAlign;
    repeatHeader: boolean;
  };
  tableRow: {
    header: boolean;
    keepTogether: boolean;
    height?: UnitsSize;
  };
  tableCell: {
    header: boolean;
    colSpan?: number;
    rowSpan?: number;
    align?: TableAlign;
    verticalAlign?: TableVerticalAlign;
    background?: Color;
    /** A number is a percentage of the table width, a length is absolute. */
    width?: number | UnitsSize;
  };
};

export type TableAlign = 'left' | 'center' | 'right';

export type TableVerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * The rule drawn around and between every cell. Word writes one border set for
 * the whole table (all six of `top`, `bottom`, `left`, `right`,
 * `insideHorizontal` and `insideVertical`), so a table is bordered uniformly or
 * not at all rather than side by side.
 */
export type TableBordersConfig = {
  color: Color;
  size: UnitsSize;
  style: TableBorderStyle;
};

export type TableBorderStyle = 'single' | 'dashed' | 'none';

/**
 * The CSS `border-style` that draws the same rule as a
 * {@link TableBorderStyle}, which OOXML names after its own `w:val` values.
 */
export const TABLE_BORDER_CSS_STYLES = {
  single: 'solid',
  dashed: 'dashed',
  none: 'none',
} as const satisfies Record<TableBorderStyle, string>;

export type ElementType = keyof ConfigByElementType;

/**
 * The marker a list draws beside each of its items, named after the OOXML
 * `w:numFmt` values it maps onto. CSS names the same markers differently, so
 * the DOM target translates through {@link LIST_FORMAT_STYLE_TYPES}.
 */
export const LIST_FORMATS = [
  'decimal',
  'lowerLetter',
  'upperLetter',
  'lowerRoman',
  'upperRoman',
  'bullet',
] as const;

export type ListFormat = (typeof LIST_FORMATS)[number];

/**
 * The CSS `list-style-type` that draws the same marker as a {@link ListFormat}.
 * Browsers -- and therefore the DOM and PDF targets -- read this, Word reads
 * the numbering format, and the two have to name the same marker.
 */
export const LIST_FORMAT_STYLE_TYPES = {
  decimal: 'decimal',
  lowerLetter: 'lower-alpha',
  upperLetter: 'upper-alpha',
  lowerRoman: 'lower-roman',
  upperRoman: 'upper-roman',
  bullet: 'disc',
} as const satisfies Record<ListFormat, string>;

/**
 * The `type` attribute of an `<ol>` for a {@link ListFormat}. It is redundant
 * with `list-style-type` in a modern browser, but it is what a reader that
 * ignores CSS (a plain-HTML export, a mail client) numbers the list by.
 */
export const LIST_FORMAT_OL_TYPES = {
  decimal: '1',
  lowerLetter: 'a',
  upperLetter: 'A',
  lowerRoman: 'i',
  upperRoman: 'I',
  bullet: undefined,
} as const satisfies Record<ListFormat, undefined | string>;

export type DocumentElement<TContent> = DocumentConfig & {
  stacks: Array<StackElement<TContent>>;
};

export type StackElement<TContent> = StackConfig & {
  layouts: LayoutConfig<TContent>;
  content: TContent;
};

export const PARAGRAPH_TAG_NAMES = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  // A `pre` is a paragraph that keeps its own line breaks, not a container:
  // text written straight into one is content rather than stray markup.
  'pre',
] as const satisfies readonly TagName[];

export type ElementData<
  TElementType extends keyof ConfigByElementType = keyof ConfigByElementType,
> = TElementType extends unknown
  ? {
      elementType: TElementType;
      elementOptions: ConfigByElementType[TElementType];
      contentOptions: TypographyOptions; // TODO: Rename to typography
      variant: undefined | VariantName;
    }
  : never;

export type ContentElementOptions = TypographyOptions; // TODO: Rename to typography

/**
 * `undefined` rather than a falsy value, so that `variant: ''` is left out
 * exactly as it was before the attribute names moved into a handle.
 */
const encodeTruthy = (value: unknown): undefined | string =>
  value ? encodeDataAttributeValue(value) : undefined;

/**
 * The element's data attributes, named by {@link ELEMENT_DATA_ATTRIBUTES}.
 * Every payload is a JSON value written through `encodeURI`; a falsy one
 * (a missing variant) is left out.
 */
export const encodeElementData = ({
  elementType,
  elementOptions,
  contentOptions,
  variant,
}: ElementData<ElementType>): Record<string, unknown> =>
  ELEMENT_DATA_ATTRIBUTES.encodeDataAttributes({
    elementType: encodeTruthy(elementType),
    elementOptions: encodeTruthy(elementOptions),
    contentOptions: encodeTruthy(contentOptions),
    variant: encodeTruthy(variant),
  });

export const decodeElementData = ({
  properties,
}: {
  properties: Record<string, unknown>;
}): ElementData => {
  const decoded: Partial<Record<string, JsonValue>> = mapValues(
    ELEMENT_DATA_ATTRIBUTES.decodeDataAttributes(properties),
    decodeDataAttributeValue,
  );
  const { elementType, elementOptions, contentOptions = {}, variant } = decoded;
  if (!elementType && !elementOptions) {
    // Default to element type htmltag.
    return {
      elementType: 'htmltag',
      elementOptions: {},
      contentOptions,
      variant,
    } as ElementData;
  }
  if (!elementType || !elementOptions) {
    throw new TypeError('Both type and data must be set.');
  }
  return {
    elementType,
    elementOptions,
    contentOptions,
    variant,
  } as ElementData;
};

export const selectDomElement = (
  rootDomElement: Element,
  elementType: ElementType,
) =>
  rootDomElement.querySelectorAll(
    ELEMENT_DATA_ATTRIBUTES.selector({
      elementType: encodeDataAttributeValue(elementType),
    }),
  );

const isIntersection = (...arrays: ReadonlyArray<ReadonlyArray<any>>) => {
  return !!intersection(...arrays).length;
};

export const isElementOfType = <
  TData extends ElementData<ElementType>,
  TElementType extends ElementType,
>(
  data: TData,
  elementType: TElementType | readonly TElementType[],
): data is TData & ElementData<TElementType> =>
  isIntersection(
    [data.elementType],
    Array.isArray(elementType) ? elementType : [elementType],
  );

export const isChildOfElementType = (
  parentElementTypes: readonly ElementType[],
  elementType: ElementType | readonly ElementType[],
) =>
  isIntersection(
    parentElementTypes,
    Array.isArray(elementType) ? elementType : [elementType],
  );

export const isChildOfTagName = (
  parentTagNames: readonly TagName[],
  tagName: TagName | readonly TagName[],
) =>
  isIntersection(parentTagNames, Array.isArray(tagName) ? tagName : [tagName]);
