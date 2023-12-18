import { intersection } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import {
  selectByDataAttributes,
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes.js';
import {
  ID_PREFIX,
  type DocumentConfig,
  type LayoutType,
  type ParagraphOptions,
  type TextOptions,
  type CounterOptions,
  type StackConfig,
  type LayoutConfig,
  type VariantName,
} from './options.js';
import type { TagName } from './html.js';

type ConfigByElementType = {
  document: DocumentConfig;
  stack: StackConfig;
  header: { layoutType: LayoutType };
  content: Record<string, unknown>;
  footer: { layoutType: LayoutType };
  htmltag: {
    paragraph?: ParagraphOptions;
    text?: TextOptions;
    variant?: VariantName;
  };
  counter: CounterOptions;
};

export type ElementType = keyof ConfigByElementType;

export const selectDomElement = <TElementType extends ElementType>(
  rootDomElement: Element,
  elementType: TElementType,
  elementConfig: Partial<ConfigByElementType[TElementType]> &
    Record<string, undefined | string>,
) =>
  selectByDataAttributes(
    rootDomElement,
    { elementType, ...elementConfig },
    { prefix: ID_PREFIX },
  );

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
] as const satisfies readonly TagName[];

export type ElementData<
  TElementType extends keyof ConfigByElementType = keyof ConfigByElementType,
> = TElementType extends unknown
  ? {
      elementType: TElementType;
      elementOptions: ConfigByElementType[TElementType];
    }
  : never;

export type ContentElementOptions = TextOptions & ParagraphOptions;

// TODO: Expand to data-[prefix]-[subkey of options] vs
// data-[prefix]-[elementType or elementOptions]
export const encodeElementData = ({
  elementType,
  elementOptions,
  ...extraData
}: Record<string, unknown> & ElementData<ElementType>) =>
  encodeDataAttributes(
    { elementType, elementOptions, ...extraData } as JsonObject,
    {
      prefix: ID_PREFIX,
    },
  ) as Record<string, unknown>;

// TODO: Add TagName here.
export const decodeElementData = ({
  properties,
}: {
  properties: Record<string, unknown>;
}): ElementData => {
  const { elementType, elementOptions } = decodeDataAttributes(properties, {
    prefix: ID_PREFIX,
  });
  if (!elementType && !elementOptions) {
    // Default to element type htmltag.
    return { elementType: 'htmltag', elementOptions: {} };
  }
  if (!elementType || !elementOptions) {
    throw new TypeError('Both type and data must be set.');
  }
  return {
    elementType,
    elementOptions,
  } as ElementData;
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
