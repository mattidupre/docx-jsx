import { mapObjectValues } from 'src/utils';
import {
  Document,
  Header,
  Footer,
  Paragraph,
  TextRun,
  type IDocumentOptions,
  type ISectionOptions,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import { type AnyNode } from './node';
import { type SchemaContext } from './schema';

type Child<TName extends keyof SchemaProps> = {
  __type?: 'child';
} & TName;

type Children<TName extends keyof SchemaProps> = {
  __type?: 'children';
} & ReadonlyArray<TName>;

type SchemaProps = {
  text: { text: string };
  document: Omit<IDocumentOptions, 'sections'> & {
    children: Children<'section'>;
  };
  section: Omit<ISectionOptions, 'children' | 'header' | 'footer'> & {
    children: Children<'paragraph' | 'table'>;
    headers?: Partial<
      Record<keyof ISectionOptions['headers'], Child<'header'>>
    >;
    footers?: Partial<
      Record<keyof ISectionOptions['footers'], Child<'footer'>>
    >;
  };
  header: { children: Children<'paragraph' | 'table'> };
  footer: { children: Children<'paragraph' | 'table'> };
  paragraph: Omit<IParagraphOptions, 'children'> & {
    children: Children<'text' | 'textrun'>;
  };
  textrun: Omit<IRunOptions, 'children'> & {
    children: Children<'text' | 'textrun'>;
  };
  table: Record<string, never>;
};

type SchemaReactRecursive<TObj extends Record<string, unknown>> = {
  [K in keyof TObj]: TObj[K] extends { __type: 'child' | 'children' }
    ? AnyNode
    : TObj[K] extends Record<string, any>
    ? SchemaReactRecursive<TObj[K]>
    : TObj[K];
};

export type SchemaPropsObj = SchemaReactRecursive<SchemaProps>;

// type SchemaDocxRecursive<TObj extends Record<string, unknown>> = {
//   [K in keyof TObj]: TObj[K] extends Child<infer T>
//     ? T
//     : TObj[K] extends Children<infer T>
//     ? T
//     : TObj[K] extends Record<string, any>
//     ? SchemaReactRecursive<TObj[K]>
//     : TObj[K];
// };

// type SchemaDocx = SchemaDocxRecursive<SchemaProps>;

export const Schema = {
  text: {
    parseProps: ({ text }) => {
      return { text };
    },
    renderDocx: ({ text }) => new TextRun({ children: [text] }),
  },

  document: {
    parseProps: ({ children, ...options }, { parseChildren }) => {
      const sections = parseChildren(children, {
        types: ['section'],
        allowEmpty: false,
      });
      return { ...options, sections };
    },
    renderDocx: (options) => new Document(options),
  },

  section: {
    parseProps: (
      { children, headers, footers },
      { parseChildren, parseChild },
    ) => {
      return {
        children: parseChildren(children, { types: ['paragraph', 'table'] }),
        headers: mapObjectValues(headers ?? {}, (_, header) =>
          parseChild(header, { type: ['header'] }),
        ),
        footers: mapObjectValues(footers ?? {}, (_, footer) =>
          parseChild(footer, { type: ['footer'] }),
        ),
      };
    },
    renderDocx: (options) => options,
  },

  header: {
    parseProps: ({ children }, { parseChildren }) => {
      return {
        children: parseChildren(children, { types: ['paragraph', 'table'] }),
      };
    },
    renderDocx: (options) => new Header(options),
  },

  footer: {
    parseProps: ({ children }, { parseChildren }) => {
      return {
        children: parseChildren(children, { types: ['paragraph', 'table'] }),
      };
    },
    renderDocx: (options) => new Footer(options),
  },

  paragraph: {
    parseProps: ({ children, ...options }, { parseChildren }) => {
      return {
        children: parseChildren(children, { types: ['textrun', 'text'] }),
        ...options,
      };
    },
    renderDocx: (options) => new Paragraph(options),
  },

  textrun: {
    parseProps: ({ children, ...options }, { parseChildren }) => {
      return {
        children: parseChildren(children, { types: ['textrun', 'text'] }),
        ...options,
      };
    },
    renderDocx: (options) => new TextRun(options),
  },

  table: {
    parseProps: (props) => ({}) as Record<string, never>,
    renderDocx: () => {
      throw new Error('TODO');
    },
  },
} as const satisfies {
  [N in keyof SchemaPropsObj]: {
    parseProps: (props: SchemaPropsObj[N], context: SchemaContext) => unknown;
    renderDocx: (options: unknown) => unknown;
  };
};
