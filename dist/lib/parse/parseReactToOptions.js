import { mapObjectValues } from 'src/utils';
import { defineParser } from './createParser';
const PARSERS = {
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
export const parseReactToOptions = defineParser(PARSERS);
//# sourceMappingURL=parseReactToOptions.js.map