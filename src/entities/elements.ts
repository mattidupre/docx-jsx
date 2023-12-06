import { intersection } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import {
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes.js';
import {
  ID_PREFIX,
  DocumentConfig,
  LayoutType,
  ParagraphOptions,
  TextOptions,
  CounterOptions,
  StackConfig,
  LayoutConfig,
} from './options.js';

type ConfigByElementType = {
  document: DocumentConfig;
  stack: StackConfig;
  header: { layoutType: LayoutType };
  content: Record<string, unknown>;
  footer: { layoutType: LayoutType };
  htmltag: {
    paragraph?: ParagraphOptions;
    text?: TextOptions;
  };
  counter: CounterOptions;
};

export type ElementType = keyof ConfigByElementType;

export type Document<TContent> = DocumentConfig & {
  stacks: Array<Stack<TContent>>;
};

export type Stack<TContent> = StackConfig & {
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

export const encodeElementData = ({
  elementType,
  elementOptions,
}: ElementData<ElementType>) =>
  encodeDataAttributes({ elementType, elementOptions } as JsonObject, {
    prefix: ID_PREFIX,
  }) as Record<string, unknown>;

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
export type TagName = keyof JSX.IntrinsicElements;
