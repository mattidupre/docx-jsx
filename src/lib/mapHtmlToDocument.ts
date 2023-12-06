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
  DocumentOptions,
  StackOptions,
  LayoutOptions,
  assignLayoutOptions,
  assignStackOptions,
  assignDocumentOptions,
  assignHtmlAttributes,
  isChildOfElementType,
  Document,
  mapLayoutKeys,
  LayoutConfig,
  createDefaultLayoutConfig,
  StackConfig,
  DocumentConfig,
} from '../entities';
import { MappedNode, mapHtml } from '../utils/mapHtml/mapHtml';
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

type NodeBase =
  | Record<string, never>
  | {
      tagName: TagName;
      properties: HtmlAttributes;
      data: MapData;
    };

export type DocumentTextNode = {
  type: 'text';
  value: string;
  data: Omit<MapData, 'element'>;
};

export type DocumentElementNode<TChild extends MappedNode> = {
  type: 'element';
} & NodeBase & {
    children: ReadonlyArray<TChild>;
  };

export type DocumentRootNode<TChild extends MappedNode> = {
  type: 'root';
} & NodeBase & {
    children: ReadonlyArray<TChild>;
  };

export type DocumentNode<TChild extends MappedNode> =
  | DocumentTextNode
  | DocumentElementNode<TChild>
  | DocumentRootNode<TChild>;

export type MapDocumentCallback<TChild extends MappedNode> = (
  node: DocumentNode<TChild>,
) => false | undefined | TChild;

// TODO: Create enum for explicit fragment / omit.
export const mapHtmlToDocument = <TChild extends MappedNode>(
  html: string,
  parseElement: MapDocumentCallback<TChild> = (node) => node as TChild,
): Document<TChild> => {
  // TODO: Always return context. If passing through, just don't change it.

  let layoutElements = createDefaultLayoutConfig();

  // TODO: Better type than "any"
  const documents = mapHtml<NodeBase, any>(html, {
    initialContext: {},
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
        !isChildOfElementType(parentElementTypes, 'document')
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
        return false;
      }
      return parseElement({
        type: 'text',
        value,
        data,
      });
      // return handleText({
      //   type: 'text',
      //   value,
      //   textValue: value,
      //   textOptions: parentContext.textOptions!,
      //   data: { context: parentContext },
      // }) as TChild;
    },
    onElementAfterChildren: (node, context) => {
      // TODO: Better to explicitly return children and flatmap?
      const { childContext } = context;

      const children = context.children as TChild[];

      const {
        data: { element: elementData },
      } = childContext;

      if (isElementOfType(elementData, 'document')) {
        return {
          ...elementData.elementOptions,
          stacks: children,
        };
      }

      if (isElementOfType(elementData, 'stack')) {
        const layouts = layoutElements;
        layoutElements = createDefaultLayoutConfig();
        return {
          ...elementData.elementOptions,
          layouts,
          content: children,
        };
      }

      if (isElementOfType(elementData, ['header', 'footer'])) {
        const {
          elementType,
          elementOptions: { layoutType },
        } = elementData;
        const renderedElement = parseElement({
          ...childContext,
          type: 'root',
          children: children,
        });
        assignLayoutOptions(layoutElements, {
          [layoutType]: { [elementType]: renderedElement },
        });
        return false;
      }

      if (isElementOfType(elementData, ['content'])) {
        return undefined;
      }

      if (isElementOfType(elementData, CONTENT_ELEMENT_TYPES)) {
        return parseElement({ ...childContext, type: 'element', children });
      }

      throw new TypeError('Invalid element.');
    },
  });

  if (documents.length > 1) {
    throw new Error('Expected no more than one document.');
  }

  if (documents.length === 0) {
    throw new Error('No document elements found.');
  }

  return documents[0];
};
