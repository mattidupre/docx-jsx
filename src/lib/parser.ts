import { Document, Header, Footer, Paragraph, TextRun, Table } from 'docx';
import { createElement } from 'react';
import { type Parser, type RenderType, type IntrinsicType } from 'src/entities';

type Parsers = { [K in IntrinsicType]: Parser<K> };

const DOCX_PARSERS: Parsers = {
  document: (options) => new Document(options),
  section: (options) => options,
  header: (options) => new Header(options),
  footer: (options) => new Footer(options),
  paragraph: (options) => new Paragraph(options),
  textrun: (options) => new TextRun(options),
  table: (options) => new Table(options),
};

const REACT_PARSERS: Parsers = {
  document: (options) => options,
  section: (options) => options,
  header: ({ children }) => createElement('header', {}, children),
  footer: ({ children }) => createElement('footer', {}, children),
  paragraph: ({ children }) => createElement('p', {}, children),
  textrun: ({ children }) => createElement('span', {}, children),
  table: ({ children }) => createElement('table', {}, children),
};

const AST_PARSERS: Parsers = {
  document: (options, { type }) => ({ type, options }),
  section: (options, { type }) => ({ type, options }),
  header: (options, { type }) => ({ type, options }),
  footer: (options, { type }) => ({ type, options }),
  paragraph: (options, { type }) => ({ type, options }),
  textrun: (options, { type }) => ({ type, options }),
  table: (options, { type }) => ({ type, options }),
};

export const createParser = (renderType: RenderType): Parser => {
  if (renderType === 'docx') {
    return (options, renderContext) =>
      DOCX_PARSERS[renderContext.type](options, renderContext);
  }
  if (renderType === 'react') {
    return (options, renderContext) =>
      REACT_PARSERS[renderContext.type](options, renderContext);
  }
  if (renderType === 'ast') {
    return (options, renderContext) => {
      return AST_PARSERS[renderContext.type](options, renderContext);
    };
  }
  throw new TypeError('Invalid parser type.');
};
