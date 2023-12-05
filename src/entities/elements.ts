import { type TagName, ID_PREFIX } from './options.js';
import { intersection, pickBy } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import { type MapElement } from '../utils/mapHtml/mapHtml.js';
import {
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes.js';
import {
  DocumentOptions,
  StackOptions,
  TextOptions,
  ParagraphOptions,
  OptionsByElementType,
} from './options.js';

const isIntersection = (...arays: ReadonlyArray<ReadonlyArray<any>>) => {
  return !!intersection(...arays).length;
};

// TODO: ELEMENT_TYPES_BY_CONTEXT

// TODO: Rename Root to ContentRoot, element to ContentElement.

export type HtmlAttributes = Record<string, unknown>;

const ELEMENT_ATTRIBUTE_KEYS = [
  'class',
  'style',
] as const satisfies ReadonlyArray<keyof ElementHtmlAttributes>;

export type ElementHtmlAttributes = {
  class?: string;
  style?: string;
} & Record<`data-${string}`, string>;

const filterElementHtmlAttributes = (attributes: HtmlAttributes) =>
  pickBy(attributes, (value, key) => {
    if (key.startsWith('data-')) {
      return true;
    }
    if (ELEMENT_ATTRIBUTE_KEYS.includes(key as any)) {
      return true;
    }
    return false;
  });

export const extendElementHtmlAttributes = (
  attributesA: HtmlAttributes = {},
  attributesB: HtmlAttributes = {},
): ElementHtmlAttributes => ({
  ...filterElementHtmlAttributes(attributesA),
  ...filterElementHtmlAttributes(attributesB),
  class:
    [attributesA.class || [], attributesB.class || []].flat().join(' ') ||
    undefined,
  style:
    [attributesA.style || [], attributesB.style || []].flat().join(' ') ||
    undefined,
});

const ELEMENT_TYPES_LAYOUT = ['document', 'stack'] as const;

type ElementTypeLayout = (typeof ELEMENT_TYPES_LAYOUT)[number];

const ELEMENT_TYPES_ROOT = ['header', 'content', 'footer'] as const;

type ElementTypeRoot = (typeof ELEMENT_TYPES_ROOT)[number];

const ELEMENT_TYPES_CONTENT = ['htmltag', 'counter'] as const;

type ElementTypeContent = (typeof ELEMENT_TYPES_CONTENT)[number];

export type ElementType =
  | ElementTypeLayout
  | ElementTypeRoot
  | ElementTypeContent;

export const PARAGRAPH_TAG_NAMES = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const satisfies readonly TagName[];

export type DocumentContext = {
  documentOptions: DocumentOptions;
};

export type StackContext = {
  stackOptions: StackOptions;
};

export type ContentContext = {
  textOptions: TextOptions;
  paragraphOptions: ParagraphOptions;
};

export type ElementData<
  TElementType extends keyof OptionsByElementType = keyof OptionsByElementType,
> = TElementType extends unknown
  ? {
      elementType: TElementType;
      elementOptions: OptionsByElementType[TElementType];
    }
  : never;

export const encodeElementData = ({
  elementType,
  elementOptions,
}: ElementData): HtmlAttributes => {
  return encodeDataAttributes({ elementType, elementOptions } as JsonObject, {
    prefix: ID_PREFIX,
  });
};

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

export const isElementOfType = <
  TData extends ElementData,
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
