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
  getIntrinsicTextOptions,
} from '../entities';
import { mapHtml } from '../utils/mapHtml/mapHtml';

const CONTENT_ELEMENT_TYPES = [
  'htmltag',
  'counter',
] as const satisfies ReadonlyArray<ElementType>;

const CONTENT_ROOT_TYPES = [
  'header',
  'content',
  'footer',
] as const satisfies ReadonlyArray<ElementType>;

type MapData = {
  parentElementTypes: ReadonlyArray<ElementType>;
  parentTagNames: ReadonlyArray<TagName>;
  element: ElementData<ElementType>;
  elementsContext: ElementsContext;
};

type NodeBase = {
  tagName: TagName;
  properties: HtmlAttributes;
  data: MapData;
};

export type HtmlTextNode = {
  type: 'text';
  value: string;
  data: Omit<MapData, 'element'>;
};

export type HtmlElementNode = {
  type: 'element';
} & NodeBase & {
    children: ReadonlyArray<unknown>;
  };

export type HtmlRootNode = {
  type: 'root';
} & NodeBase & {
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

  const documents = mapHtml<NodeBase, unknown>(html, {
    initialContext: {} as NodeBase,
    onElementBeforeChildren: ({ htmlElement, parentContext }) => {
      const { tagName } = htmlElement;
      const {
        parentElementTypes = [],
        parentTagNames = [],
        elementsContext: parentOptionsContext = {},
      } = parentContext?.data ?? {};

      const elementData = decodeElementData(htmlElement);

      const optionsContext = assignElementsContext({}, parentOptionsContext);

      const childContext: NodeBase = {
        ...htmlElement,
        data: {
          parentElementTypes: [...parentElementTypes, elementData.elementType],
          parentTagNames: [...parentTagNames, htmlElement.tagName],
          element: elementData,
          elementsContext: optionsContext,
        },
      };

      if (isElementOfType(elementData, 'document')) {
        // TODO: This will throw if there are HTML elements above the document?
        if (parentElementTypes.length) {
          throw new TypeError(
            'Document cannot be a child of any other elements.',
          );
        }

        assignElementsContext(optionsContext, {
          document: elementData.elementOptions,
        });

        // assignDocumentOptions(elementData.elementOptions);
        // optionsContext.document = elementData.elementOptions;
        return childContext;
      }

      if (isElementOfType(elementData, 'stack')) {
        if (!isChildOfElementType(parentElementTypes, 'document')) {
          throw new TypeError('Stack must be a child of document.');
        }

        assignElementsContext(optionsContext, {
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

        assignElementsContext(optionsContext, elementData.elementOptions, {
          text: getIntrinsicTextOptions(tagName),
        });

        if (elementData.elementType === 'counter') {
          if (
            !isChildOfElementType(parentElementTypes, 'header') &&
            !isChildOfElementType(parentElementTypes, 'footer')
          ) {
            throw new TypeError('Counter must be a child of header of footer.');
          }
        }

        return childContext;
      }

      throw new TypeError('Invalid context.');
    },
    onText: ({ text, parentContext: { data } }) => {
      const { parentTagNames } = data;
      if (!isChildOfTagName(parentTagNames!, PARAGRAPH_TAG_NAMES)) {
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

      const children = context.children;

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
