import {
  type Size,
  type PageMargin,
  type LayoutsPartial,
} from './primitives.js';

export type DocumentOptions<TContent> = {
  size?: Size;
  pages?: {
    enableCoverPage?: boolean;
  };
};

export const DEFAULT_DOCUMENT_OPTIONS = {
  size: {
    width: '8.5in',
    height: '11in',
  },
  pages: {
    enableCoverPage: false,
  },
} as const satisfies DocumentOptions<unknown>;

export type StackOptions<TContent> = {
  layouts?: LayoutsPartial<TContent>;
  margin?: Partial<PageMargin>;
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

export type ParagraphOptions = Record<string, never>;

export type TextOptions = Record<string, never>;
