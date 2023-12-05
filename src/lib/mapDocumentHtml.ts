import {
  ElementType,
  ElementData,
  HtmlAttributes,
  DocumentContext,
  StackContext,
  ContentContext,
  decodeElementData,
  isElementOfType,
  isChildOfTagName,
  PARAGRAPH_TAG_NAMES,
  TagName,
  TextOptions,
  LayoutsPartial,
  extendLayouts,
  assignLayouts,
} from '../entities';

import {
  MappedNode,
  MapHtmlElementAfterChildren,
  mapHtml,
} from '../utils/mapHtml/mapHtml';
import { IfNever, Simplify } from 'type-fest';

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
): TChild => {
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

  if (documents.length === 0) {
    throw new Error('No document elements found.');
  }

  return documents[0];
};
