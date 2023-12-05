import {
  type CounterType,
  type Size,
  type Margin,
  type LayoutsPartial,
  type TagName,
  type LayoutType,
  ID_PREFIX,
  assignLayouts,
  extendLayouts,
} from './primitives.js';
import { intersection, kebabCase, pickBy } from 'lodash-es';
import type { JsonObject, IfNever, Simplify, KebabCase } from 'type-fest';
import {
  mapHtml,
  type MapElement,
  type MappedNode,
  MapHtmlElementAfterChildren,
} from '../utils/mapHtml/mapHtml.js';
import {
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes.js';

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

type ElementType = ElementTypeLayout | ElementTypeRoot | ElementTypeContent;

export const PARAGRAPH_TAG_NAMES = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const satisfies readonly TagName[];

export const DEFAULT_PAGE_SIZE = {
  width: '8.5in',
  height: '11in',
} as const satisfies Size;

export type DocumentOptions = {
  size?: Size;
  pages?: {
    enableCoverPage?: boolean;
  };
};

export const DEFAULT_DOCUMENT_OPTIONS = {
  size: DEFAULT_PAGE_SIZE,
  pages: {
    enableCoverPage: false,
  },
} as const satisfies DocumentOptions;

export type StackOptions = {
  coverPage?: boolean;
  layouts?: LayoutsPartial<unknown>;
  margin?: Partial<Margin>;
};

export const DEFAULT_STACK_OPTIONS = {
  layouts: {},
  margin: {
    header: '0.25in',
    top: '0.25in',
    right: '0.5in',
    bottom: '0.25in',
    footer: '0.25in',
    left: '0.5in',
  },
} as const satisfies StackOptions;

export type DocumentRoot<TContent> = {
  options: DocumentOptions;
  stacks: Array<DocumentStack<TContent>>;
};

export type DocumentStack<TContent> = {
  options: StackOptions;
  content: TContent;
};

export type ParagraphOptions = {
  // align?: 'left' | 'right' | 'justified';
};

export type TextOptions = {
  fontWeight?: 'bold';
  fontStyle?: 'italic'; // docx "italics"
  // color?: string; // docx hex without preceding #
  // fontSize?: `${number}rem`; // docx "size" in half-points
  // letterSpacing?: `${number}em`; // docx "characterSpacing" in twips
  // strikethrough?: boolean; // docx "strike"
  // caps?: boolean; // docx "allCaps"
};

export type ContentOptions = ParagraphOptions & TextOptions;

export type CounterOptions = TextOptions & {
  counterType: CounterType;
};

export type OptionsByElementType = {
  document: DocumentOptions;
  stack: StackOptions;
  header: { layoutType: LayoutType };
  content: Record<string, never>;
  htmltag: ContentOptions;
  footer: { layoutType: LayoutType };
  counter: CounterOptions;
};

export const optionsToCssVars = <
  TOptions extends OptionsByElementType[keyof OptionsByElementType],
>(
  options: TOptions,
) =>
  Object.entries(options).reduce(
    (obj, [key, value]) => {
      if (value) {
        Object.assign(obj, {
          [`--${kebabCase(key)}`]: value,
        });
      }
      return obj;
    },
    {} as {
      [T in keyof TOptions as KebabCase<T> extends string
        ? `--${KebabCase<T>}`
        : never]: TOptions[T];
    },
  );

export const optionsToCssVarsString = (
  ...args: Parameters<typeof optionsToCssVars>
): string =>
  Object.entries(optionsToCssVars(...args))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

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

type ElementData<
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

const decodeElementData = (element: MapElement): ElementData => {
  const { properties } = element;
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

const isElementOfType = <
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

const isChildOfElementType = (
  parentElementTypes: readonly ElementType[],
  elementType: ElementType | readonly ElementType[],
) =>
  isIntersection(
    parentElementTypes,
    Array.isArray(elementType) ? elementType : [elementType],
  );

const isChildOfTagName = (
  parentTagNames: readonly TagName[],
  tagName: TagName | readonly TagName[],
) =>
  isIntersection(parentTagNames, Array.isArray(tagName) ? tagName : [tagName]);

type MapContextBase<TElementType extends ElementType = ElementType> = IfNever<
  TElementType,
  { elementType?: undefined; elementOptions?: undefined } & {
    contextType: unknown;
    tagName?: never;
    htmlAttributes?: never;
    parentElementTypes?: never;
    parentTagNames?: never;
  },
  ElementData<TElementType> & {
    contextType: unknown;
    tagName: TagName;
    htmlAttributes: HtmlAttributes;
    parentElementTypes: ReadonlyArray<ElementType>;
    parentTagNames: ReadonlyArray<TagName>;
  }
>;

type MapContext =
  | ({
      contextType: 'initial';
    } & MapContextBase<never>)
  | ({
      contextType: 'document';
    } & MapContextBase<'htmltag' | 'document'> &
      DocumentContext)
  | ({
      contextType: 'stack';
    } & MapContextBase<'htmltag' | 'stack'> &
      DocumentContext &
      StackContext)
  | ({
      contextType: 'content';
    } & MapContextBase<
      'htmltag' | 'header' | 'content' | 'footer' | 'counter'
    > &
      DocumentContext &
      StackContext &
      ContentContext);

export type MapDocumentText = {
  textValue: string;
  textOptions: TextOptions;
};

export type MapDocumentElement<TChild extends MappedNode> = Simplify<
  MapContext & {
    contextType: Exclude<MapContext['contextType'], 'initial'>;
  } & {
    children: ReadonlyArray<TChild>;
  }
>;

export type MapDocumentOptions<TChild extends MappedNode> = {
  onText: (context: MapDocumentText) => TChild;
  onElement: (
    context: MapDocumentElement<TChild>,
  ) => false | undefined | TChild;
};

// TODO: rename onElement node to htmlElement, merge onElement parameters.
// TODO: Create enum for explicit fragment / omit.
// TODO: Only run callback for content elements. Construct a tree from the rest.

export const mapDocument = <TChild extends MappedNode>(
  html: string,
  { onText: handleText, onElement }: MapDocumentOptions<TChild>,
): undefined | TChild => {
  const renderElement = (
    context: MapHtmlElementAfterChildren<MapContext, TChild>,
  ) => {
    const { childContext, children } = context;

    if (childContext.contextType === 'initial') {
      throw new TypeError('Do not render elements in "initial" context.');
    }

    return onElement({
      ...childContext,
      children,
    });
  };

  let layoutElements: LayoutsPartial<TChild> = {};

  const documents = mapHtml<MapContext, TChild>(html, {
    initialContext: {
      contextType: 'initial',
    },
    onElementBeforeChildren: (node, { parentContext }) => {
      const element = decodeElementData(node);

      const parentElementTypes = [
        ...(parentContext.parentElementTypes ?? []),
        element.elementType,
      ];
      const parentTagNames = [
        ...(parentContext.parentTagNames ?? []),
        node.tagName,
      ];

      if (parentContext.contextType === 'initial') {
        if (isElementOfType(element, 'document')) {
          return {
            ...element,
            contextType: 'document',
            tagName: node.tagName,
            htmlAttributes: node.properties,
            parentElementTypes,
            parentTagNames,
            documentOptions: element.elementOptions,
          } satisfies MapContext;
        }

        if (isElementOfType(element, 'htmltag')) {
          return parentContext;
        }

        throw new TypeError('Invalid element type above document.');
      }

      if (parentContext.contextType === 'document') {
        if (isElementOfType(element, 'stack')) {
          return {
            ...element,
            contextType: 'stack',
            tagName: node.tagName,
            htmlAttributes: node.properties,
            parentElementTypes,
            parentTagNames,
            documentOptions: parentContext.documentOptions,
            stackOptions: {
              ...element.elementOptions,
              layouts: extendLayouts(element.elementOptions.layouts),
            },
          } satisfies MapContext;
        }
        if (isElementOfType(element, 'htmltag')) {
          return undefined;
        }
        throw new TypeError('Invalid element type between document and stack.');
      }

      if (parentContext.contextType === 'stack') {
        if (isElementOfType(element, ['header', 'content', 'footer'])) {
          return {
            ...element,
            contextType: 'content',
            tagName: node.tagName,
            htmlAttributes: node.properties,
            parentElementTypes,
            parentTagNames,
            documentOptions: parentContext.documentOptions,
            stackOptions: parentContext.stackOptions,
            textOptions: {},
            paragraphOptions: {},
          } satisfies MapContext;
        }
      }

      // TODO: Add another context for paragraph?
      if (parentContext.contextType === 'content') {
        if (isElementOfType(element, ['htmltag', 'counter'])) {
          // TODO: If paragraphOptions, update element options.

          const defaultTextOptions =
            node.tagName === 'b'
              ? ({
                  fontWeight: 'bold',
                } as const)
              : {};

          return {
            ...element,
            contextType: 'content',
            tagName: node.tagName,
            htmlAttributes: node.properties,
            parentElementTypes,
            parentTagNames,
            documentOptions: parentContext.documentOptions,
            stackOptions: parentContext.stackOptions,
            textOptions: {
              // TODO
              ...parentContext.textOptions,
              ...defaultTextOptions,
              ...element.elementOptions,
            },
            paragraphOptions: {
              // TODO
            },
          } satisfies MapContext;
        }
        throw new TypeError('Invalid content element.');
      }

      throw new Error('Invalid context.');
    },
    onText: ({ value }, { parentContext }) => {
      if (
        !isChildOfTagName(parentContext.parentTagNames!, PARAGRAPH_TAG_NAMES)
      ) {
        console.warn('Text not enclosed in a paragraph or heading is ignored.');
        return false;
      }
      if (parentContext.contextType !== 'content') {
        return false;
      }
      return handleText({
        textValue: value,
        textOptions: parentContext.textOptions!,
      }) as TChild;
    },
    onElementAfterChildren: (node, data) => {
      const { childContext } = data;

      if (childContext.contextType === 'initial') {
        return undefined;
      }

      if (isElementOfType(childContext, ['header', 'footer'])) {
        const renderedElement = renderElement(data);
        const {
          elementType,
          elementOptions: { layoutType },
        } = childContext;
        assignLayouts(layoutElements, {
          [layoutType]: { [elementType]: renderedElement },
        });
        return false;
      }

      if (isElementOfType(childContext, 'stack')) {
        childContext.stackOptions.layouts = layoutElements;
        layoutElements = {};
      }

      return renderElement(data);
    },
  });

  if (documents.length > 1) {
    throw new Error('Expected no more than one document.');
  }

  return documents[0];
};
