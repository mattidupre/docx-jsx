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
  type ListContext,
  assignElementsContext,
  INTRINSIC_TYPOGRAPHY_OPTIONS,
  assignTypographyOptions,
} from '../entities';
import { mapHtml, type MapElement } from '../utils/mapHtml/mapHtml';
import { getValueOf } from '../utils/object';
import { isValueInArray } from '../utils/array';

const CONTENT_ELEMENT_TYPES = [
  'repeater',
  'repeaterItem',
  'gridContainer',
  'gridItem',
  'htmltag',
  'htmlraw',
  'break',
  'pagecount',
  'pagenumber',
  'split',
  'masonryGroup',
  'positionalTab',
  'image',
  'divider',
  'spacer',
  'list',
  'table',
  'tableRow',
  'tableCell',
] as const satisfies ReadonlyArray<ElementType>;

const LIST_TAG_NAMES = ['ul', 'ol'] as const satisfies ReadonlyArray<TagName>;

/**
 * The element type each table tag has to carry, which is what the `Table`,
 * `TableRow` and `TableCell` components encode onto it.
 *
 * A bare `<table>` written as markup would reach the DOCX target as a run of
 * loose text -- Word has no table it was not told to build -- so a table tag
 * without its element is refused here rather than losing its rows in one
 * target only. `<thead>`, `<tbody>` and `<colgroup>` carry no content of their
 * own and are left to the ordinary tag handling.
 */
const TABLE_TAG_ELEMENT_TYPES = {
  table: 'table',
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
} as const satisfies Partial<Record<TagName, ElementType>>;

const CONTENT_ROOT_TYPES = [
  'header',
  'content',
  'footer',
] as const satisfies ReadonlyArray<ElementType>;

/**
 * The Split component always renders one wrapper element per side.
 */
const SPLIT_SIDE_COUNT = 2;

/**
 * A side of a Split contributes exactly one child to the split. Targets whose
 * parseNode returns the children of a wrapper element it does not recognize
 * (the DOCX parser does this for a plain `div`) map a side to a single-element
 * array; unwrap those so every target sees the same two children.
 */
const unwrapSingleNode = (node: unknown) =>
  Array.isArray(node) && node.length === 1 ? node[0] : node;

/**
 * The list context an `<ol>`, `<ul>` or `List` opens: one level deeper than the
 * list around it (0 when there is none) and a numbering instance of its own.
 *
 * A plain `<ol>` numbers in decimals and a plain `<ul>` draws bullets, which is
 * what a browser does for them and therefore what Word has to be told to do.
 * `List` states the marker outright and its element options win.
 */
const openListContext = (
  elementsContext: ElementsContext,
  { tagName, properties }: MapElement,
  elementData: ElementData<ElementType>,
  { instance }: { instance: number },
): ListContext => {
  const options = isElementOfType(elementData, 'list')
    ? elementData.elementOptions
    : undefined;
  // `<ol start="4">` is the only list option HTML carries as an attribute.
  const startAttribute = Number(properties.start);
  return {
    level: elementsContext.list.level + 1,
    instance,
    format: options?.format ?? (tagName === 'ol' ? 'decimal' : 'bullet'),
    start:
      options?.start ??
      (Number.isFinite(startAttribute) && startAttribute > 0
        ? startAttribute
        : 1),
    indent: options?.indent,
  };
};

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
  // Every list opened anywhere in the document takes the next number, so no two
  // lists share a numbering instance and none continues another's count.
  let listInstanceCount = 0;

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

      if (tagName === 'a' && htmlElement.properties.href) {
        // Word styles a link through a character style on the runs inside it,
        // so those runs have to know they are in one. An `<a>` carrying only an
        // `id` is a bookmark target rather than a link and stays unstyled.
        assignElementsContext(elementsContext, { isInsideHyperlink: true });
      }

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
        if (parentElementTypes.includes('repeaterItem')) {
          throw new TypeError(
            'Repeater items cannot contain Stack sections. Repeat content inside a Stack instead.',
          );
        }
        if (!isChildOfElementType(parentElementTypes, 'document')) {
          throw new TypeError('Stack must be a child of document.');
        }

        const { columns } = elementData.elementOptions;

        assignElementsContext(elementsContext, {
          stack: elementData.elementOptions,
          isInsideColumn: columns.columnCount > 1,
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

      if (
        isElementOfType(elementData, 'htmlraw') ||
        parentElementTypes.includes('htmlraw')
      ) {
        // Raw markup is not validated, but it is still typography: the tags it
        // contains have to mean the same thing here as they do anywhere else,
        // or a target that reads the context (DOCX) renders raw content
        // differently from the browser's own defaults.
        assignElementsContext(elementsContext, {
          isHtmlRaw: true,
          contentOptions: assignTypographyOptions(
            {},
            getValueOf(INTRINSIC_TYPOGRAPHY_OPTIONS, tagName),
            elementData.contentOptions,
          ),
          ...(isValueInArray(tagName, PARAGRAPH_TAG_NAMES) && {
            isInsideParagraph: true,
          }),
          ...(isValueInArray(tagName, LIST_TAG_NAMES) && {
            list: openListContext(elementsContext, htmlElement, elementData, {
              instance: (listInstanceCount += 1),
            }),
          }),
        });

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

        const isChildOfParagraph = isChildOfTagName(
          parentTagNames,
          PARAGRAPH_TAG_NAMES,
        );

        if (isElementOfType(elementData, ['repeater', 'repeaterItem'])) {
          if (parentElementTypes.at(-1) === 'gridContainer') {
            throw new TypeError(
              'Place Repeater inside a GridItem, or repeat a complete Grid.',
            );
          }
          if (
            isChildOfParagraph ||
            ['ul', 'ol', 'table', 'thead', 'tbody', 'tr'].includes(
              parentTagNames.at(-1) ?? '',
            )
          ) {
            throw new TypeError(
              'Block Repeater must contain document blocks. Use mode="rows" for table rows, or repeat a complete List.',
            );
          }
          if (
            isElementOfType(elementData, 'repeaterItem') &&
            parentElementTypes.at(-1) !== 'repeater'
          ) {
            throw new TypeError(
              'Repeater items must be direct children of Repeater.',
            );
          }
        }

        if (
          isElementOfType(elementData, 'masonryGroup') &&
          parentElementTypes.at(-1) !== 'content'
        ) {
          throw new TypeError(
            'A MasonryGroup must be a direct child of a Stack, where it is one unit of masonry columns.',
          );
        }

        if (isElementOfType(elementData, 'gridContainer')) {
          if (isChildOfParagraph) {
            throw new TypeError('Grids cannot be nested inside paragraphs.');
          }
          if (elementsContext.stack.columns.columnCount > 1) {
            throw new TypeError(
              'Grids cannot be nested inside sections with columns.',
            );
          }
          if (
            isChildOfElementType(parentElementTypes, [
              'gridItem',
              'gridContainer',
            ])
          ) {
            throw new TypeError('Grids cannot be nested inside other grids.');
          }
        }
        if (isElementOfType(elementData, 'gridItem')) {
          if (isChildOfParagraph) {
            throw new TypeError('Grids cannot be nested inside paragraphs.');
          }
          if (!isChildOfElementType(parentElementTypes, ['gridContainer'])) {
            throw new TypeError(
              'Grid items must be nested inside grid containers.',
            );
          }
        }

        const tableElementType = getValueOf(TABLE_TAG_ELEMENT_TYPES, tagName);
        if (tableElementType && elementData.elementType !== tableElementType) {
          throw new TypeError(
            `A <${tagName}> must be rendered by the Table, TableRow and TableCell components so that every target builds the same table.`,
          );
        }
        if (isElementOfType(elementData, 'table')) {
          if (isChildOfParagraph) {
            throw new TypeError('Tables cannot be nested inside paragraphs.');
          }
        }
        if (isElementOfType(elementData, 'tableRow')) {
          if (!isChildOfElementType(parentElementTypes, 'table')) {
            throw new TypeError('Table rows must be nested inside a table.');
          }
        }
        if (isElementOfType(elementData, 'tableCell')) {
          if (!isChildOfElementType(parentElementTypes, 'table')) {
            throw new TypeError('Table cells must be nested inside a table.');
          }
          if (!isChildOfElementType(parentElementTypes, 'tableRow')) {
            throw new TypeError(
              'Table cells must be nested inside a table row.',
            );
          }
        }

        // A <br> outside a paragraph is discarded in onElementAfterChildren.
        // Returning parentContext here would make mapHtml re-run the parent
        // element with an empty child list, wiping the surrounding content.

        if (isValueInArray(tagName, PARAGRAPH_TAG_NAMES)) {
          if (isChildOfParagraph) {
            throw new TypeError(
              'Paragraph-ish tags (e.g., p, h1, li) cannot be nested inside one another.',
            );
          }
          assignElementsContext(elementsContext, {
            isInsideParagraph: true,
          });
        }

        assignElementsContext(elementsContext, elementData.elementOptions, {
          contentOptions: assignTypographyOptions(
            {},
            getValueOf(INTRINSIC_TYPOGRAPHY_OPTIONS, tagName),
            elementData.contentOptions,
          ),
          variant: elementData.variant,
        });

        if (isValueInArray(tagName, LIST_TAG_NAMES)) {
          assignElementsContext(elementsContext, {
            list: openListContext(elementsContext, htmlElement, elementData, {
              instance: (listInstanceCount += 1),
            }),
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
      const { parentTagNames, parentElementTypes } = data;
      if (
        !isChildOfTagName(parentTagNames, PARAGRAPH_TAG_NAMES) &&
        !isChildOfTagName(parentTagNames, 'svg')
      ) {
        // A Split side, a table cell and a Raw element are content holders of
        // their own: text written straight into one is content, not stray
        // markup between blocks, and dropping it would show up as missing text
        // in one target only. Everything else keeps the paragraph rule.
        if (
          !isChildOfElementType(parentElementTypes, [
            'split',
            'tableCell',
            'htmlraw',
            'repeaterItem',
          ])
        ) {
          if (text.trim()) {
            console.warn(
              'Text not enclosed in a paragraph or heading is ignored.',
            );
          }
          return [];
        }
        if (!text.trim()) {
          // Whitespace between two blocks is formatting, not content.
          return [];
        }
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

      // A grid item's row and its offset within that row are a function of the
      // sizes of the items before it, which every target already has: the
      // container receives its items in order (DOCX) or lets floats wrap
      // themselves (DOM). Nothing about a grid has to be tracked across
      // callbacks here.

      const { elementsContext } = childContext.data;

      if (
        childContext.tagName === 'br' &&
        !elementsContext.isInsideParagraph &&
        !elementsContext.isHtmlRaw
      ) {
        console.warn(
          'Line breaks outside of a paragraph or heading are ignored.',
        );
        return [];
      }

      if (isElementOfType(elementData, CONTENT_ELEMENT_TYPES)) {
        if (isElementOfType(elementData, 'split')) {
          // `children` is flat, so a side mapping to no nodes or to several
          // would move the boundary between the left and the right side.
          // `data.children` holds one entry per side element instead.
          const sides = childContext.data.children;
          if (sides.length !== SPLIT_SIDE_COUNT) {
            throw new TypeError(
              `Split must render exactly ${SPLIT_SIDE_COUNT} sides, received ${sides.length}.`,
            );
          }
          return parseNode({
            ...childContext,
            type: 'element',
            children: sides.map(unwrapSingleNode),
          });
        }

        const parsedNode = parseNode({
          ...childContext,
          type: 'element',
          children,
        });

        const parentData = context.parentContext?.data;
        if (parentData && isElementOfType(parentData.element, 'split')) {
          // Record the side so that the split above can group by side rather
          // than by the flattened child count.
          parentData.children.push(parsedNode);
          return [];
        }

        return parsedNode;
      }

      throw new TypeError('Invalid element.');
    },
  }) as ReadonlyArray<DocumentElement<TContent>>;

  if (documents.length > 1) {
    console.debug(documents);
    throw new Error('Expected no more than one document.');
  }

  if (documents.length === 0) {
    throw new Error('No document elements found.');
  }

  return documents[0];
};
