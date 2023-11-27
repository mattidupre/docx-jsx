import {
  type Size,
  type Margin,
  type LayoutsPartial,
  TagName,
} from './primitives.js';
import { cloneDeep } from 'lodash-es';
import { type ReadonlyDeep } from 'type-fest';

// TODO: Rename to document.ts?

type ElementTypeLayout = 'document' | 'stack';

type ElementTypeRoot = 'header' | 'content' | 'footer';

type ElementTypeContent = 'paragraph' | 'textrun';

type ElementType = ElementTypeLayout | ElementTypeRoot | ElementTypeContent;

// type ElementOptions<TContent> = {
//   document: DocumentOptions<TContent>;
//   stack: StackOptions<TContent>;
//   paragraph: ParagraphOptions;
//   textrun: TextOptions;
// };

// export type ElementData<TContent> = {
//   [T in keyof ElementOptions<TContent>]: {
//     elementType: T;
//     options: ElementOptions<TContent>[T];
//   };
// };

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
  layouts?: LayoutsPartial<TContent>;
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

export type TextOptions = {
  fontWeight?: 'bold';
  fontStyle?: 'italic'; // docx "italics"
  // color?: string; // docx hex without preceding #
  // fontSize?: `${number}rem`; // docx "size" in half-points
  // letterSpacing?: `${number}em`; // docx "characterSpacing" in twips
  // strikethrough?: boolean; // docx "strike"
  // caps?: boolean; // docx "allCaps"
};

export type ParagraphOptions = TextOptions & {
  // align?: 'left' | 'right' | 'justified';
};

export type ContentContext = {
  parentTagNames: ReadonlyArray<string>;
  parentElementTypes: ReadonlyArray<ElementType>;
  page: ReadonlyDeep<{
    size: Size;
    margin: Margin;
  }>;
  text: TextOptions;
  paragraph: ParagraphOptions;
};

export const createContentContext = (
  elementTypeRoot: ElementTypeRoot,
  { page }: Pick<ContentContext, 'page'>,
): ContentContext => {
  return {
    parentElementTypes: ['document', 'stack', elementTypeRoot],
    parentTagNames: ['div', 'div', 'div'],
    page: cloneDeep(page),
    text: {},
    paragraph: {},
  };
};

type ExtendContextOptions = {
  elementType: ElementType;
  tagName: TagName;
  text?: TextOptions;
  paragraph?: ParagraphOptions;
};

export const extendContentContext = (
  prevContext: ContentContext,
  { elementType, tagName, text, paragraph }: ExtendContextOptions,
): ContentContext => {
  // TODO: Make sure page counters only appear in headers / footers.

  const textOptions: TextOptions = { ...prevContext.text, ...text };

  if (tagName === 'b') {
    textOptions.fontWeight = 'bold';
  }

  if (tagName === 'em') {
    textOptions.fontStyle = 'italic';
  }

  return {
    page: prevContext.page,
    parentElementTypes: [...prevContext.parentElementTypes, elementType],
    parentTagNames: [...prevContext.parentTagNames, tagName],
    text: textOptions,
    paragraph: { ...prevContext.text, ...paragraph },
  };
};
