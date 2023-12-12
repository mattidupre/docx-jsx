import { intersection } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import {
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
  type DocumentOptions,
  type StackOptions,
  assignDocumentOptions,
  assignStackOptions,
  assignParagraphOptions,
  assignTextOptions,
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
  };
  counter: CounterOptions;
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

type ElementsContextOptions = {
  document?: DocumentOptions;
  stack?: StackOptions;
  paragraph?: ParagraphOptions;
  text?: TextOptions;
};

export type ElementsContext = {
  document: undefined | DocumentConfig;
  stack: undefined | StackConfig;
  paragraph: undefined | ParagraphOptions;
  text: undefined | TextOptions;
};

const assignElementsContextValue = <T extends keyof ElementsContext>(
  key: T,
  [targetOption = {}, ...options]: ReadonlyArray<
    ElementsContextOptions | ElementsContext | undefined
  >,
): undefined | ElementsContext[T] => {
  const values = options.flatMap((option) => option?.[key] || []);
  switch (key) {
    case 'document':
      return assignDocumentOptions(
        targetOption.document,
        ...values,
      ) as ElementsContext[T];
    case 'stack':
      return assignStackOptions(
        targetOption.stack,
        ...values,
      ) as ElementsContext[T];
    case 'paragraph':
      return assignParagraphOptions(
        targetOption.paragraph,
        ...values,
      ) as ElementsContext[T];
    case 'text':
      return assignTextOptions(
        targetOption.text,
        ...values,
      ) as ElementsContext[T];
    default:
      throw new TypeError('Invalid key.');
  }
};

export const assignElementsContext = (
  ...args: ReadonlyArray<
    Record<string, unknown> &
      (ElementsContextOptions | ElementsContext | undefined)
  >
): ElementsContext =>
  Object.assign(args[0], {
    document: assignElementsContextValue('document', args),
    stack: assignElementsContextValue('stack', args),
    paragraph: assignElementsContextValue('paragraph', args),
    text: assignElementsContextValue('text', args),
  });
