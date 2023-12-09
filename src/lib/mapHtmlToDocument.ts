import { optionsToCssVarsString } from 'src/utils/cssVars';
import {
  ElementType,
  ElementData,
  HtmlAttributes,
  decodeElementData,
  isElementOfType,
  isChildOfTagName,
  PARAGRAPH_TAG_NAMES,
  TagName,
  TextOptions,
  ParagraphOptions,
  assignLayoutOptions,
  assignStackOptions,
  assignDocumentOptions,
  assignHtmlAttributes,
  isChildOfElementType,
  DocumentElement,
  createDefaultLayoutConfig,
  StackConfig,
  DocumentConfig,
  StackElement,
} from '../entities';
import { mapHtml } from '../utils/mapHtml/mapHtml';
import { merge } from 'lodash-es';

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
  // TODO: Rename to configsContext
  optionsContext: {
    documentOptions?: DocumentConfig;
    stackOptions?: StackConfig;
    paragraphOptions?: ParagraphOptions;
    textOptions?: TextOptions;
  };
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

// TODO: Create enum for explicit fragment / omit.
export const mapHtmlToDocument = (
  html: string,
  parseNode: ParseHtmlNode,
): DocumentElement<unknown> => {
  // TODO: Always return context. If passing through, just don't change it.

  let layoutElements = createDefaultLayoutConfig();

  // TODO: Better type than "any"
  const documents = mapHtml<NodeBase, unknown>(html, {
    initialContext: {} as NodeBase,
    onElementBeforeChildren: (node, { parentContext }) => {
      const { tagName } = node;
      const {
        parentElementTypes = [],
        parentTagNames = [],
        optionsContext: parentOptionsContext = {},
      } = parentContext?.data ?? {};

      const elementData = decodeElementData(node);

      const optionsContext: NodeBase['data']['optionsContext'] =
        structuredClone(parentOptionsContext);

      // const temp: Omit<NodeBase, 'data'> = { ...node };

      const childContext: NodeBase = {
        ...node,
        data: {
          parentElementTypes: [...parentElementTypes, elementData.elementType],
          parentTagNames: [...parentTagNames, node.tagName],
          element: elementData,
          optionsContext,
        },
      };

      if (isElementOfType(elementData, 'document')) {
        // TODO: allow htmltag elementType.
        if (parentElementTypes.length) {
          throw new TypeError(
            'Document cannot be a child of any other elements.',
          );
        }
        assignDocumentOptions(elementData.elementOptions);
        optionsContext.documentOptions = elementData.elementOptions;
        return childContext;
      }

      if (isElementOfType(elementData, 'stack')) {
        if (!isChildOfElementType(parentElementTypes, 'document')) {
          throw new TypeError('Stack must be a child of document.');
        }

        // TODO: Change extendStackOptions to assignStackOptions
        elementData.elementOptions = assignStackOptions(
          elementData.elementOptions,
        );

        optionsContext.stackOptions = elementData.elementOptions;

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
          throw new TypeError('Content root must be a child of content root.');
        }

        if (tagName === 'b') {
          merge(elementData.elementOptions, {
            text: {
              fontWeight: 'bold',
            },
          });
        }

        optionsContext.textOptions ??= {};
        if ('text' in elementData.elementOptions) {
          merge(optionsContext.textOptions, elementData.elementOptions.text);
        }

        optionsContext.paragraphOptions ??= {};
        if ('paragraph' in elementData.elementOptions) {
          merge(
            optionsContext.paragraphOptions,
            elementData.elementOptions.paragraph,
          );
        }

        if (elementData.elementType === 'counter') {
          merge(childContext.properties, {
            ['data-counter-type']: elementData.elementOptions.counterType,
          });
        }

        assignHtmlAttributes(childContext.properties, {
          style: optionsToCssVarsString(elementData.elementOptions),
        });

        return childContext;
      }

      throw new TypeError('Invalid context.');
    },
    onText: ({ value }, { parentContext: { data } }) => {
      const { parentTagNames } = data;
      if (!isChildOfTagName(parentTagNames!, PARAGRAPH_TAG_NAMES)) {
        console.warn('Text not enclosed in a paragraph or heading is ignored.');
        return [];
      }

      return parseNode({
        type: 'text',
        value,
        data,
      });
    },
    onElementAfterChildren: (node, context) => {
      const { childContext } = context;

      const children = context.children;

      const {
        data: { element: elementData },
      } = childContext;

      if (isElementOfType(elementData, 'document')) {
        return {
          ...elementData.elementOptions,
          stacks: children as StackElement<unknown>[],
        } satisfies DocumentElement<unknown>;
      }

      if (isElementOfType(elementData, 'stack')) {
        const layouts = layoutElements;
        layoutElements = createDefaultLayoutConfig();

        return {
          ...elementData.elementOptions,
          layouts,
          children,
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
        return parseNode({
          ...childContext,
          type: 'root',
          children,
        });
      }

      if (isElementOfType(elementData, CONTENT_ELEMENT_TYPES)) {
        return parseNode({ ...childContext, type: 'element', children });
      }

      throw new TypeError('Invalid element.');
    },
  }) as ReadonlyArray<DocumentElement<unknown>>;

  if (documents.length > 1) {
    throw new Error('Expected no more than one document.');
  }

  if (documents.length === 0) {
    throw new Error('No document elements found.');
  }

  return documents[0];
};
