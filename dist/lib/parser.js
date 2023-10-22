import { Document, Header, Footer, Paragraph, TextRun, Table } from 'docx';
import { asArray } from 'src/utils';
const AST_PARSERS = {
    document: (options, { type }) => ({ type, options }),
    section: (options, { type }) => ({ type, options }),
    header: (options, { type }) => ({ type, options }),
    footer: (options, { type }) => ({ type, options }),
    paragraph: (options, { type }) => ({ type, options }),
    textrun: (options, { type }) => ({ type, options }),
    table: (options, { type }) => ({ type, options }),
};
const DOCX_PARSERS = {
    document: ({ children, ...options }) => new Document({ ...options, sections: children }),
    section: (options) => options,
    header: (options) => new Header(options),
    footer: (options) => new Footer(options),
    paragraph: (options) => new Paragraph(options),
    textrun: (options) => new TextRun(options),
    table: (options) => new Table(options),
};
const parseHtmlChildren = (children) => asArray(children).join('');
const HTML_PARSERS = {
    document: ({ children, ...options }) => ({
        ...options,
        pagesGroups: children,
    }),
    section: ({ children, ...options }) => ({
        ...options,
        html: parseHtmlChildren(children),
    }),
    header: ({ children }) => ({
        html: `<header>${parseHtmlChildren(children)}</header>`,
    }),
    footer: ({ children }) => ({
        html: `<footer>${parseHtmlChildren(children)}</footer>`,
    }),
    paragraph: ({ children }) => `<p>${parseHtmlChildren(children)}</p>`,
    textrun: ({ children, text }) => `<span>${parseHtmlChildren(text ?? children)}</span>`,
    table: ({ children }) => `<table>${parseHtmlChildren(children)}</table>`,
};
export const createParser = (renderType) => {
    if (renderType === 'docx') {
        return (options, renderContext) => DOCX_PARSERS[renderContext.type](options, renderContext);
    }
    if (renderType === 'html') {
        return (options, renderContext) => {
            return HTML_PARSERS[renderContext.type](options, renderContext);
        };
    }
    if (renderType === 'ast') {
        return (options, renderContext) => {
            return AST_PARSERS[renderContext.type](options, renderContext);
        };
    }
    throw new TypeError('Invalid parser type.');
};
//# sourceMappingURL=parser.js.map