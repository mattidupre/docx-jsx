import { Type, type TSchema } from '@sinclair/typebox';
import { asArray } from 'src/utils';
import { Document, Header, Footer, Paragraph, TextRun, Table } from 'docx';
import { Relation } from 'src/lib/Relation';

export const ELEMENT_TYPES = [
  'document',
  'pagesGroup',
  'header',
  'content',
  'footer',
  'paragraph',
  'textrun',
  'table',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export type ParsedElement = {
  type: ElementType;
  props: any;
};

export type Parser<TNode = unknown> = (
  node: TNode,
) => ReadonlyArray<ParsedElement>;

export type Renderer<TElement = unknown> = (
  parsedNode: ParsedElement,
) => TElement;

export type ElementSchemas = Record<ElementType, TSchema>;

export const elementSchemas: ElementSchemas = {
  document: Type.Object({
    children: Relation({ type: 'pagesGroup', required: true }),
  }),
  pagesGroup: Type.Object({
    headers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: Relation({ type: 'header', single: true }),
          first: Relation({ type: 'header', single: true }),
          even: Relation({ type: 'header', single: true }),
          odd: Relation({ type: 'header', single: true }),
        }),
      ),
    ),
    children: Relation({ type: 'content', single: true, required: true }),
    footers: Type.Optional(
      Type.Partial(
        Type.Object({
          default: Relation({ type: 'footer', single: true }),
          first: Relation({ type: 'footer', single: true }),
          even: Relation({ type: 'footer', single: true }),
          odd: Relation({ type: 'footer', single: true }),
        }),
      ),
    ),
  }),
  header: Type.Object({
    children: Relation({
      type: ['paragraph', 'table'],
      required: true,
    }),
  }),
  content: Type.Object({
    children: Relation({
      type: ['paragraph', 'table'],
      required: true,
    }),
  }),
  footer: Type.Object({
    children: Relation({
      type: ['paragraph', 'table'],
      required: true,
    }),
  }),
  paragraph: Type.Object({
    children: Relation({ type: 'textrun' }),
  }),
  textrun: Type.Object({
    children: Relation({ type: 'textrun' }),
  }),
  table: Type.Never({}),
};

export type ElementRenderers = Record<ElementType, Renderer>;

export const astRenderer: Renderer = ({ type, props }) => {
  return { type, props };
};

export const docxRenderer: Renderer<any> = ({ type, props }) => {
  switch (type) {
    case 'document': {
      const { children, ...options } = props;
      return new Document({ ...options, sections: children });
    }
    case 'pagesGroup': {
      // TODO: merge odd pages with default.
      return props;
    }
    case 'header': {
      return new Header(props);
    }
    case 'footer': {
      return new Footer(props);
    }
    case 'paragraph': {
      return new Paragraph(props);
    }
    case 'textrun': {
      const { children, ...options } = props;
      return new TextRun({
        ...options,
        children: children?.length ? children : undefined,
      });
    }
    case 'table': {
      return new Table(props);
    }
  }
};

export const htmlRenderer: Renderer = ({ type, props }) => {
  switch (type) {
    case 'document': {
      const { children, ...options } = props;
      return {
        ...options,
        pagesGroups: children,
      };
    }
    case 'pagesGroup': {
      const { children, ...options } = props;
      return props;
    }
    case 'header': {
      const { children } = props;
      return `<header>${asArray(children).join('')}</header>`;
    }
    case 'footer': {
      const { children } = props;
      return `<footer>${asArray(children).join('')}</footer>`;
    }
    case 'paragraph': {
      const { children } = props;
      return `<p>${asArray(children).join('')}</p>`;
    }
    case 'textrun': {
      const { children, text } = props;
      return `<p>${asArray(children).join('')}</p>`;
    }
    case 'table': {
      const { children } = props;
      return `<table>${asArray(children).join('')}</table>`;
    }
  }
};
