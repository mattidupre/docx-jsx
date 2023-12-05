import { kebabCase } from 'lodash-es';
import { KebabCase } from 'type-fest';
import { type UnitsNumber } from '../utils/units.js';

export const PACKAGE_NAME: Lowercase<string> = 'matti-docs';

export const ID_PREFIX: Lowercase<string> = 'matti-docs';

export const APP_NAME = 'Matti Docs';

export type TagName = keyof JSX.IntrinsicElements;

export type CounterType = (typeof COUNTER_TYPES)[number];

export const COUNTER_TYPES = ['page-number', 'page-count'] as const;

export type Size = {
  width: UnitsNumber;
  height: UnitsNumber;
};

export type Margin = {
  top: UnitsNumber;
  right: UnitsNumber;
  bottom: UnitsNumber;
  left: UnitsNumber;
  header: UnitsNumber;
  footer: UnitsNumber;
};

export type Layout<TElement> = {
  header: TElement;
  footer: TElement;
};

export type LayoutPartial<TElement> = Partial<Layout<TElement>>;

export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const LAYOUT_TYPES = [
  'first',
  'default',
] as const satisfies ReadonlyArray<keyof Layouts<unknown>>;

// TODO: Rename to LayoutOptions to match TextOptions, ParagraphOptions.
export type Layouts<TElement> = {
  first: false | Required<Layout<undefined | TElement>>;
  default: Required<Layout<undefined | TElement>>;
};

export type LayoutsPartial<TElement> = {
  first?: false | LayoutPartial<TElement>;
  default?: LayoutPartial<TElement>;
};

export const createDefaultLayouts = <TElement>(): Layouts<TElement> => ({
  first: {
    header: undefined,
    footer: undefined,
  },
  default: {
    header: undefined,
    footer: undefined,
  },
});

export const assignLayouts = <TElement>(
  target: LayoutsPartial<TElement>,
  ...args: ReadonlyArray<undefined | LayoutsPartial<TElement>>
) => {
  const defaultLayouts = createDefaultLayouts<TElement>();
  const keys = Object.keys(defaultLayouts) as ReadonlyArray<
    keyof Layouts<unknown>
  >;
  return [defaultLayouts, ...args].reduce((targetLayouts, thisLayouts) => {
    keys.forEach((key) => {
      if (
        key === 'first' &&
        (thisLayouts?.first === false || targetLayouts?.first === false)
      ) {
        targetLayouts!.first = false;
        return;
      }
      if (thisLayouts?.[key] === false) {
        throw new TypeError('Only the "first" layout may be false.');
      }
      if (!thisLayouts?.[key]) {
        return;
      }
      if (!targetLayouts![key]) {
        targetLayouts![key] = {};
      }
      const thisLayout = thisLayouts![key] as Layout<unknown>;
      const targetLayout = targetLayouts![key] as Layout<unknown>;
      if (thisLayout.header) {
        targetLayout.header = thisLayout.header;
      }
      if (thisLayout.footer) {
        targetLayout.footer = thisLayout.footer;
      }
    });
    return targetLayouts;
  }, target) as Layouts<TElement>;
};

export const extendLayouts = <TElement>(
  ...layoutsArgs: ReadonlyArray<undefined | LayoutsPartial<TElement>>
): Layouts<TElement> =>
  assignLayouts<TElement>(createDefaultLayouts<TElement>(), ...layoutsArgs);
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

export type ParagraphOptions = {};

export type TextOptions = {
  fontWeight?: 'bold';
  fontStyle?: 'italic'; // docx "italics"
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
