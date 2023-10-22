import { mapObjectValues } from 'src/utils';
export const PROPS_PARSERS = {
    document: ({ children, ...options }, { renderChildren }) => ({
        ...options,
        children: renderChildren(children, ['section']),
    }),
    section: ({ children, headers, footers }, { renderChildren, renderChild }) => {
        return {
            children: renderChildren(children, ['paragraph', 'table']),
            headers: mapObjectValues(headers ?? {}, (_, header) => renderChild(header, ['header'])),
            footers: mapObjectValues(footers ?? {}, (_, footer) => renderChild(footer, ['footer'])),
        };
    },
    header: ({ children }, { renderChildren }) => {
        return {
            children: renderChildren(children, ['paragraph', 'table']),
        };
    },
    footer: ({ children }, { renderChildren }) => {
        return {
            children: renderChildren(children, ['paragraph', 'table']),
        };
    },
    paragraph: ({ children, ...options }, { renderChildren }) => {
        return {
            children: renderChildren(children, ['textrun']),
            ...options,
        };
    },
    textrun: ({ children, ...options }, { renderChildren }) => {
        const renderedChildren = renderChildren(children, ['textrun']);
        return {
            children: renderedChildren.length >= 1 ? renderedChildren : undefined,
            ...options,
        };
    },
    table: (props) => ({}),
};
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
//# sourceMappingURL=element.js.map