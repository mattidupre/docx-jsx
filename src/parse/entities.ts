import { mapObjectValues } from 'src/utils';
import {
  Document,
  Header,
  Footer,
  Paragraph,
  TextRun,
  Table,
  type IDocumentOptions,
  type ISectionOptions,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import { type ReactNode } from 'react';
import { type RenderContext, type IntrinsicElement } from 'src/render';

export type ParserEnvironment = 'docx' | 'ast';

export type Parser = (
  intrinsicElement: IntrinsicElement,
  context: RenderContext,
) => any;

declare const CHILD_TYPE: unique symbol;

type Child = ReactNode & {
  [CHILD_TYPE]?: 'child';
};

type Children = ReactNode & {
  [CHILD_TYPE]?: 'child';
};

export const PROPS_PARSERS = {
  document: (
    {
      sections,
      ...options
    }: Omit<IDocumentOptions, 'sections'> & {
      sections: ReactNode;
    },
    { renderChildren },
  ) => {
    return {
      ...options,
      sections: renderChildren(sections, ['section']),
    };
  },
  section: (
    {
      children,
      headers,
      footers,
    }: Omit<ISectionOptions, 'children' | 'header' | 'footer'> & {
      children: ReactNode;
      headers?: Partial<Record<keyof ISectionOptions['headers'], ReactNode>>;
      footers?: Partial<Record<keyof ISectionOptions['footers'], ReactNode>>;
    },
    { renderChildren, renderChild },
  ) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
      headers: mapObjectValues(headers ?? {}, (_, header) =>
        renderChild(header, ['header']),
      ),
      footers: mapObjectValues(footers ?? {}, (_, footer) =>
        renderChild(footer, ['footer']),
      ),
    };
  },
  header: ({ children }: { children: ReactNode }, { renderChildren }) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
    };
  },
  footer: ({ children }: { children: ReactNode }, { renderChildren }) => {
    return {
      children: renderChildren(children, ['paragraph', 'table']),
    };
  },
  paragraph: (
    {
      children,
      ...options
    }: Omit<IParagraphOptions, 'children'> & {
      children: ReactNode;
    },
    { renderChildren },
  ) => {
    return {
      children: renderChildren(children, ['textrun']),
      ...options,
    };
  },
  textrun: (
    {
      children,
      ...options
    }: Omit<IRunOptions, 'children'> & {
      children: ReactNode;
    },
    { renderChildren },
  ) => {
    const renderedChildren = renderChildren(children, ['textrun']);
    return {
      children: renderedChildren.length >= 1 ? renderedChildren : undefined,
      ...options,
    };
  },
  table: (props: Record<string, never>) => ({}) as Record<string, never>,
} as const satisfies Record<any, (props: any, context: RenderContext) => any>;

export type IntrinsicType = keyof typeof PROPS_PARSERS;

type Props = { [K in IntrinsicType]: Parameters<(typeof PROPS_PARSERS)[K]>[0] };

type Options = { [K in IntrinsicType]: ReturnType<(typeof PROPS_PARSERS)[K]> };

export const ENVIRONMENT_PARSERS = {
  document: { docx: (options) => new Document(options) },
  section: { docx: (options) => options },
  header: { docx: (options) => new Header(options) },
  footer: { docx: (options) => new Footer(options) },
  paragraph: { docx: (options) => new Paragraph(options) },
  textrun: { docx: (options) => new TextRun(options) },
  table: { docx: (options) => new Table(options) },
} as const satisfies {
  [K in IntrinsicType]: { docx: (options: Options[K]) => any };
};
