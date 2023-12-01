import {
  type CounterType,
  type Size,
  type Margin,
  type LayoutsPartial,
  type TagName,
  type LayoutType,
  ID_PREFIX,
} from './primitives.js';
import { omit, intersection, cloneDeep, pick } from 'lodash-es';
import type { ReadonlyDeep, JsonObject, IfNever, Jsonify } from 'type-fest';
import { mapHtml, type MapElement } from '../utils/mapHtml/mapHtml.js';
import {
  encodeDataAttributes,
  decodeDataAttributes,
} from '../utils/dataAttributes.js';

type HtmlAttributes = Record<string, unknown>;

const ELEMENT_TYPES_LAYOUT = ['document', 'stack'] as const;

type ElementTypeLayout = (typeof ELEMENT_TYPES_LAYOUT)[number];

const ELEMENT_TYPES_ROOT = ['header', 'content', 'footer'] as const;

type ElementTypeRoot = (typeof ELEMENT_TYPES_ROOT)[number];

const ELEMENT_TYPES_CONTENT = [
  'htmltag',
  'paragraph',
  'textrun',
  'counter',
] as const;

type ElementTypeContent = (typeof ELEMENT_TYPES_CONTENT)[number];

type ElementType = ElementTypeLayout | ElementTypeRoot | ElementTypeContent;

const PARAGRAPH_TAG_NAMES = [
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

export type DocumentOptions<TContent> = {
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
} as const satisfies DocumentOptions<unknown>;

export type StackOptions<TContent> = {
  layouts?: LayoutsPartial<IfNever<TContent, boolean, TContent>>;
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
} as const satisfies StackOptions<unknown>;

export type DocumentRoot<TContent> = {
  options: DocumentOptions<TContent>;
  stacks: Array<DocumentStack<TContent>>;
};

export type DocumentStack<TContent> = {
  options: StackOptions<TContent>;
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

export type ContentOptions = {
  paragraph?: ParagraphOptions;
  text?: TextOptions;
};

export type CounterOptions = {
  counterType: CounterType;
};

export type ElementOptions<TContent = never> = {
  document: DocumentOptions<TContent>;
  stack: StackOptions<TContent>;
  header: { layoutType: LayoutType };
  content: Record<string, never>;
  footer: { layoutType: LayoutType };
  counter: CounterOptions;
} & Record<ElementTypeContent, ContentOptions>;

type ElementData = {
  [T in keyof ElementOptions]: {
    elementType: T;
    elementOptions: ElementOptions[T];
  };
};

export const encodeElementData = ({
  elementType,
  elementOptions,
}: ElementData[keyof ElementData]): HtmlAttributes => {
  return encodeDataAttributes({ elementType, elementOptions } as JsonObject, {
    prefix: ID_PREFIX,
  });
};

const decodeElementData = (element: MapElement): ElementData[ElementType] => {
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
  } as ElementData[keyof ElementData];
};

const isElementType = <TElementType extends ElementType>(
  data: any,
  elementType: TElementType | readonly TElementType[],
): data is ElementData[TElementType] =>
  (Array.isArray(elementType) ? elementType : [elementType]).includes(
    data.elementType,
  );

const isIgnoredElement = (
  data: any,
  parentElementTypes: ReadonlyArray<ElementType>,
): data is ElementData['htmltag'] => {
  if (isElementType(data, ELEMENT_TYPES_LAYOUT)) {
    return false;
  }
  if (isElementType(data, ELEMENT_TYPES_ROOT)) {
    return false;
  }
  if (intersection(ELEMENT_TYPES_ROOT, parentElementTypes).length) {
    return false;
  }
  return true;
};

// TODO: Split into documentContext, stackContext, contentContext, textContext
export type MapHtmlElementsContext<TParsedElement> = {
  parentElementTypes: ElementType[];
  parentTagNames: TagName[];
  counters: {
    stackCounter: number;
  };
  layouts: undefined | LayoutsPartial<TParsedElement>;
  options: {
    document?: DocumentOptions<TParsedElement>;
    pageSize?: Size;
    margin?: Margin;
    paragraph?: ParagraphOptions;
    text?: TextOptions;
    element?: unknown;
  };
};

const createInitialMapHtmlElementsContext = <
  TContent,
>(): MapHtmlElementsContext<TContent> => ({
  parentElementTypes: [],
  parentTagNames: [],
  counters: {
    stackCounter: 0,
  },
  layouts: undefined,
  options: {},
});

const cloneMapHtmlElementsContext = <TContent>(
  prevContext: MapHtmlElementsContext<TContent>,
): MapHtmlElementsContext<TContent> => ({
  parentElementTypes: [...prevContext.parentElementTypes],
  parentTagNames: [...prevContext.parentTagNames],
  counters: prevContext.counters,
  layouts: prevContext.layouts, // TODO: Move to options.
  options: {
    ...cloneDeep(
      pick(prevContext.options, [
        'document',
        'pageSize',
        'margin',
        'paragraph',
        'text',
      ]),
    ),
  },
});

type Content = Record<string, any>;

export type DocumentText<TContent> = {
  value: string;
  context: MapHtmlElementsContext<TContent>;
};

export type OnText<TContent extends Content> = (
  data: DocumentText<TContent>,
) => false | TContent;

export type DocumentElement<TContent> = {
  tagName: TagName;
  elementType: ElementType;
  context: MapHtmlElementsContext<TContent>;
  children: TContent[];
};

export type OnElement<TContent extends Content> = (
  data: DocumentElement<TContent>,
) => false | TContent;

// TODO: Split out into onDocument, onStack, onRoot, onElement, onText.

export const mapHtmlElements = <TContent extends Content>(
  html: string,
  {
    onText,
    onElement,
  }: {
    onText: OnText<TContent>;
    onElement: OnElement<TContent>;
  },
): TContent => {
  const documents: TContent[] = [];
  mapHtml<MapHtmlElementsContext<TContent>, TContent>(html, {
    initialContext: createInitialMapHtmlElementsContext(),
    onElementBeforeChildren: (node, { parentContext }) => {
      const childContext = cloneMapHtmlElementsContext(parentContext);
      const { parentElementTypes, parentTagNames } = parentContext;
      const { options } = childContext;
      const data = decodeElementData(node);
      Object.assign(options, { element: data.elementOptions });
      childContext.parentElementTypes.push(data.elementType);
      childContext.parentTagNames.push(node.tagName);

      if (isIgnoredElement(data, parentElementTypes)) {
        return childContext;
      }

      if (isElementType(data, 'document')) {
        // TODO: create extendContext function?
        Object.assign(options, {
          pageSize: data.elementOptions.size,
          document: data.elementOptions,
        });
        return childContext;
      }

      if (isElementType(data, 'stack')) {
        Object.assign(options, { margin: data.elementOptions.margin });
        childContext.layouts = {};
        return childContext;
      }

      if (isElementType(data, ELEMENT_TYPES_ROOT)) {
        if (isElementType(data, 'content')) {
          return childContext;
        }
        const { layoutType } = data.elementOptions;
        if (parentContext.layouts![layoutType] === false) {
          return false;
        }
        return childContext;
      }

      if (isElementType(data, ELEMENT_TYPES_CONTENT)) {
        // TODO: Indicate in context if a node has not changed content options.
        // Prevents every single node from setting css vars or TextRun.

        if (
          isElementType(data, 'counter') &&
          !intersection(['header', 'footer'], parentElementTypes).length
        ) {
          throw new Error('Counters can only exist in headers or footers.');
        }

        if (
          PARAGRAPH_TAG_NAMES.includes(node.tagName as any) &&
          intersection(PARAGRAPH_TAG_NAMES, parentTagNames).length
        ) {
          throw new Error('Do not enclose paragraphs or headings recursively.');
        }

        Object.assign(options, {
          ...omit(data.elementOptions, 'paragraph', 'text'),
          paragraph: { ...options.paragraph, ...data.elementOptions.paragraph },
          text: { ...options.text, ...data.elementOptions.text },
        });

        return childContext;
      }

      throw new TypeError('Invalid element.');
    },
    onText: ({ value }, { parentContext }) => {
      if (
        !intersection(parentContext.parentTagNames, PARAGRAPH_TAG_NAMES).length
      ) {
        console.warn('Text not enclosed in a paragraph or heading is ignored.');
        return false;
      }
      return onText({ value, context: parentContext });
    },
    onElementAfterChildren: (
      node,
      { parentContext, childContext, children },
    ) => {
      const { parentElementTypes } = parentContext;
      const data = decodeElementData(node);
      const elementArg: Parameters<OnElement<TContent>>[0] = {
        tagName: node.tagName,
        elementType: data.elementType,
        context: childContext,
        children: children ?? [],
      };

      if (isIgnoredElement(data, parentElementTypes)) {
        return undefined;
      }

      if (isElementType(data, ELEMENT_TYPES_CONTENT)) {
        const element = onElement(elementArg);
        return element;
      }

      if (isElementType(data, ELEMENT_TYPES_ROOT)) {
        const layouts = childContext.layouts!;
        const rootElement = onElement(elementArg);
        if (!rootElement) {
          return rootElement;
        }
        if (isElementType(data, ['header', 'footer'])) {
          const {
            elementOptions: { layoutType },
          } = data;
          if (layouts[layoutType] !== false) {
            (layouts[layoutType] ??= {})[data.elementType] = rootElement;
          }
          return false;
        }
        return rootElement;
      }

      if (isElementType(data, 'stack')) {
        const stackElement = onElement(elementArg);
        if (!stackElement) {
          throw new Error('Stack callbacks must return a value.');
        }
        childContext.counters.stackCounter += 1;
        return stackElement;
      }

      if (isElementType(data, 'document')) {
        console.log(children);
        const documentElement = onElement(elementArg);
        if (!documentElement) {
          throw new Error('Document callbacks must return a value.');
        }
        // TODO: Not necessary. Use children.
        documents.push(documentElement);
        return documentElement;
      }

      throw new TypeError('Invalid element.');
    },
  });

  if (documents.length !== 1) {
    throw new Error('Expected exactly one document.');
  }

  return documents[0];
};
