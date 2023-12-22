import {
  type ElementType,
  type ElementData,
  type HtmlAttributes,
  decodeElementData,
  isElementOfType,
  isChildOfTagName,
  PARAGRAPH_TAG_NAMES,
  type TagName,
  assignLayoutOptions,
  isChildOfElementType,
  type DocumentElement,
  createDefaultLayoutConfig,
  type StackElement,
  type ElementsContext,
  assignElementsContext,
  INTRINSIC_TEXT_OPTIONS,
  assignContentOptions,
} from '../entities';
import { mapHtml, type MapElement } from '../utils/mapHtml/mapHtml';
import { getValueOf } from '../utils/object';
import { isValueInArray } from '../utils/array';

const CONTENT_ELEMENT_TYPES = [
  'htmltag',
  'pagecount',
  'pagenumber',
] as const satisfies ReadonlyArray<ElementType>;

const CONTENT_ROOT_TYPES = [
  'header',
  'content',
  'footer',
] as const satisfies ReadonlyArray<ElementType>;

type MapData = {
  parentData: ReadonlyArray<MapData>;
  parentElementTypes: ReadonlyArray<ElementType>;
  parentTagNames: ReadonlyArray<TagName>;
  element: ElementData<ElementType>;
  elementsContext: ElementsContext;
  children: Array<unknown>;
};

type HtmlContext = {
  tagName: TagName;
  properties: HtmlAttributes;
  data: MapData;
};

const extendHtmlContext = (
  prevHtmlContext: undefined | HtmlContext,
  elementData: ElementData,
  mapElement: MapElement,
): HtmlContext => {
  const prevData = prevHtmlContext?.data;
  const { tagName } = mapElement;
  const {
    parentData = [],
    parentElementTypes = [],
    parentTagNames = [],
    elementsContext,
  } = prevData ?? {};
  return {
    ...mapElement,
    data: {
      parentData: prevHtmlContext?.data
        ? [...parentData, prevHtmlContext.data]
        : [],
      parentElementTypes: [...parentElementTypes, elementData.elementType],
      parentTagNames: [...parentTagNames, tagName],
      element: elementData,
      elementsContext: assignElementsContext({}, elementsContext),
      children: [],
    },
  };
};

export type HtmlTextNode = {
  type: 'text';
  value: string;
  data: Omit<MapData, 'element'>;
};

export type HtmlElementNode = {
  type: 'element';
} & HtmlContext & {
    children: ReadonlyArray<unknown>;
  };

export type HtmlRootNode = {
  type: 'root';
} & HtmlContext & {
    children: ReadonlyArray<unknown>;
  };

export type HtmlNode = HtmlTextNode | HtmlElementNode | HtmlRootNode;

export type ParseHtmlNode = (
  node: HtmlNode,
) => unknown | ReadonlyArray<unknown>;

export const mapHtmlToDocument = <TContent>(
  html: string,
  parseNode: ParseHtmlNode,
): DocumentElement<TContent> => {
  let layoutElements = createDefaultLayoutConfig();
  let contentElement: unknown = undefined;

  const documents = mapHtml<HtmlContext, unknown>(html, {
    onElementBeforeChildren: ({ htmlElement, parentContext }) => {
      const { tagName } = htmlElement;
      const elementData = decodeElementData(htmlElement);
      const { parentElementTypes = [], parentTagNames = [] } =
        parentContext?.data ?? {};

      const childContext = extendHtmlContext(
        parentContext,
        elementData,
        htmlElement,
      );

      const { elementsContext } = childContext.data;

      if (isElementOfType(elementData, 'document')) {
        // TODO: This will throw if there are HTML elements above the document?
        if (parentElementTypes.length) {
          throw new TypeError(
            'Document cannot be a child of any other elements.',
          );
        }

        assignElementsContext(elementsContext, {
          document: elementData.elementOptions,
        });

        return childContext;
      }

      if (isElementOfType(elementData, 'stack')) {
        if (!isChildOfElementType(parentElementTypes, 'document')) {
          throw new TypeError('Stack must be a child of document.');
        }

        assignElementsContext(elementsContext, {
          stack: elementData.elementOptions,
        });

        return childContext;
      }

      if (
        isElementOfType(elementData, 'htmltag') &&
        !isChildOfElementType(parentElementTypes, [
          'header',
          'content',
          'footer',
        ])
      ) {
        return childContext;
      }

      if (isElementOfType(elementData, CONTENT_ROOT_TYPES)) {
        if (!isChildOfElementType(parentElementTypes, 'stack')) {
          throw new TypeError('Content root must be a child of stack.');
        }
        return childContext;
      }

      if (isElementOfType(elementData, CONTENT_ELEMENT_TYPES)) {
        if (!isChildOfElementType(parentElementTypes, CONTENT_ROOT_TYPES)) {
          throw new TypeError('Content must be a child of content root.');
        }

        if (isValueInArray(PARAGRAPH_TAG_NAMES, tagName)) {
          if (isChildOfTagName(parentTagNames, PARAGRAPH_TAG_NAMES)) {
            throw new TypeError(
              'Paragraph-ish tags (e.g., p, h1, li) cannot be nested inside one another.',
            );
          }
        }

        assignElementsContext(elementsContext, elementData.elementOptions, {
          contentOptions: assignContentOptions(
            {},
            getValueOf(tagName, INTRINSIC_TEXT_OPTIONS),
            elementData.contentOptions,
          ),
          variant: elementData.variant,
        });

        if (tagName === 'ul' || tagName === 'ol') {
          assignElementsContext(elementsContext, {
            list: {
              level: elementsContext.list.level + 1,
            },
          });
        }

        if (
          elementData.elementType === 'pagecount' ||
          elementData.elementType === 'pagenumber'
        ) {
          if (
            !isChildOfElementType(parentElementTypes, 'header') &&
            !isChildOfElementType(parentElementTypes, 'footer')
          ) {
            throw new TypeError('Counter must be a child of header of footer.');
          }
        }

        return childContext;
      }

      throw new TypeError(
        `Invalid element ${
          (elementData as ElementData).elementType
        } / tagName ${tagName}.`,
      );
    },
    onText: ({ text, parentContext: { data } }) => {
      const { parentTagNames } = data;
      if (!isChildOfTagName(parentTagNames, PARAGRAPH_TAG_NAMES)) {
        console.log(PARAGRAPH_TAG_NAMES);
        if (text.trim()) {
          console.warn(
            'Text not enclosed in a paragraph or heading is ignored.',
          );
        }
        return [];
      }

      return parseNode({
        type: 'text',
        value: text,
        data,
      });
    },
    onElementAfterChildren: (context) => {
      const { childContext } = context;

      const { children } = context;

      const {
        data: { element: elementData },
      } = childContext;

      if (isElementOfType(elementData, 'document')) {
        return {
          ...childContext.data.elementsContext.document!,
          stacks: children as StackElement<unknown>[],
        } satisfies DocumentElement<unknown>;
      }

      if (isElementOfType(elementData, 'stack')) {
        const layouts = layoutElements;
        layoutElements = createDefaultLayoutConfig();
        const content = contentElement;
        contentElement = undefined;

        return {
          ...childContext.data.elementsContext.stack!,
          layouts,
          content,
        } satisfies StackElement<unknown>;
      }

      if (isElementOfType(elementData, ['header', 'footer'])) {
        const {
          elementType,
          elementOptions: { layoutType },
        } = elementData;
        const renderedElement = parseNode({
          ...childContext,
          type: 'root',
          children,
        });
        assignLayoutOptions(layoutElements, {
          [layoutType]: { [elementType]: renderedElement },
        });
        return [];
      }

      if (isElementOfType(elementData, ['content'])) {
        contentElement = parseNode({
          ...childContext,
          type: 'root',
          children,
        });
        return [];
      }

      if (isElementOfType(elementData, CONTENT_ELEMENT_TYPES)) {
        // if (isChildOfTagName(parentTagNames, 'li')) { console.log('HERE:
        //   Remove paragraph elements'); // Paragraph-ish children of li are
        //   ignored. return children; }
        return parseNode({ ...childContext, type: 'element', children });
      }

      throw new TypeError('Invalid element.');
    },
  }) as ReadonlyArray<DocumentElement<TContent>>;

  if (documents.length > 1) {
    throw new Error('Expected no more than one document.');
  }

  if (documents.length === 0) {
    throw new Error('No document elements found.');
  }

  return documents[0];
};
