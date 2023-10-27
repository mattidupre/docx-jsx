import { Type, type TSchema } from '@sinclair/typebox';
import { asArray, mapObjectValues } from 'src/utils';
import {
  Document,
  Header,
  Footer,
  Paragraph,
  TextRun,
  Table,
  type ISectionOptions,
} from 'docx';
import { Relation } from 'src/lib/Relation';
import { v4 as createUuid } from 'uuid';

export const ELEMENT_TYPES = [
  'document',
  'pagesGroup',
  'header',
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

const pageTypeSchema = Type.Object({
  header: Type.Optional(Relation({ type: ['header'], single: true })),
  footer: Type.Optional(Relation({ type: ['footer'], single: true })),
});

export type ElementSchemas = Record<ElementType, TSchema>;

export const elementSchemas: ElementSchemas = {
  document: Type.Object({
    children: Relation({ type: 'pagesGroup', required: true }),
  }),
  pagesGroup: Type.Object({
    pageTypes: Type.Partial(
      Type.Object({
        default: pageTypeSchema,
        first: pageTypeSchema,
        even: pageTypeSchema,
        odd: pageTypeSchema,
      }),
    ),
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
    children: Relation({
      type: ['paragraph', 'table'],
      required: true,
    }),
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
      const sections = children.map(
        ({ children, pageTypes, ...options }): ISectionOptions => {
          // Because docxjs does not have an odd page, assign all values
          const headers: ISectionOptions['headers'] = {
            first: pageTypes.first?.header ?? pageTypes.default?.header,
            even: pageTypes.even?.header ?? pageTypes.default?.header,
            default: pageTypes.odd?.header ?? pageTypes.default?.header,
          };
          const footers: ISectionOptions['footers'] = {
            first: pageTypes.first?.footer ?? pageTypes.default?.footer,
            even: pageTypes.even?.footer ?? pageTypes.default?.footer,
            default: pageTypes.odd?.footer ?? pageTypes.default?.footer,
          };
          return {
            ...options,
            headers,
            footers,
            children,
          };
        },
      );
      console.log(sections);

      return new Document({
        ...options,
        sections,
      });
    }
    case 'pagesGroup': {
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
  throw new TypeError(`Invalid element type ${type}.`);
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
      const { children, pageTypes, ...options } = props;
      return {
        ...options,
        pageTypes: mapObjectValues(pageTypes, (key, { header, footer }) => ({
          headerHtml: header,
          footerHtml: footer,
        })),
        id: createUuid(),
        contentHtml: `<content>${asArray(children).join('')}</content>`,
      };
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
      const { children, text } = props;
      return `<p>${text ?? asArray(children).join('')}</p>`;
    }
    case 'textrun': {
      const { children, text } = props;
      return `<p>${text ?? asArray(children).join('')}</p>`;
    }
    case 'table': {
      const { children } = props;
      return `<table>${asArray(children).join('')}</table>`;
    }
  }
  throw new TypeError(`Invalid element type ${type}.`);
};
