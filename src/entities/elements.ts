import { intersection } from 'lodash';
import type { JsonObject } from 'type-fest';
import {
  selectByDataAttributes,
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes';
import {
  DEFAULT_PREFIX,
  type DocumentConfig,
  type LayoutType,
  type StackConfig,
  type LayoutConfig,
  type PrefixesConfig,
} from './options';
import type { TagName } from './html';
import type { TypographyOptions, VariantName } from './typography';

type ConfigByElementType = {
  document: DocumentConfig;
  stack: StackConfig;
  header: { layoutType: LayoutType };
  content: Record<string, never>;
  footer: { layoutType: LayoutType };
  htmltag: TypographyOptions & {
    variant?: VariantName;
  };
  pagenumber: Record<string, never>;
  pagecount: Record<string, never>;
};

export type ElementType = keyof ConfigByElementType;

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

export const encodeElementData = ({
  elementType,
  elementOptions,
  contentOptions,
  variant,
}: ElementData<ElementType>) =>
  encodeDataAttributes(
    { elementType, elementOptions, contentOptions, variant } as JsonObject,
    {
      prefix: DEFAULT_PREFIX,
    },
  ) as Record<string, unknown>;

export const decodeElementData = ({
  properties,
}: {
  properties: Record<string, unknown>;
}): ElementData => {
  const {
    elementType,
    elementOptions,
    contentOptions = {},
    variant,
  } = decodeDataAttributes(properties, {
    prefix: DEFAULT_PREFIX,
  });
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

export const selectDomElement = <TElementType extends ElementType>(
  prefixes: PrefixesConfig,
  rootDomElement: Element,
  elementType: TElementType,
  elementConfig?: Partial<ConfigByElementType[TElementType]> &
    Record<string, undefined | string>,
) => {
  return selectByDataAttributes(
    rootDomElement,
    { elementType, ...elementConfig },
    { prefix: DEFAULT_PREFIX },
  );
};

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
