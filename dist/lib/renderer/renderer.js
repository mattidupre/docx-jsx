import { Store } from 'src/lib/store';
import { assertIntrinsicElement, asIntrinsicElement, } from 'src/entities';
import { mapObjectValues } from 'src/utils';
import { renderNode } from './renderNode';
export const ELEMENT_RENDERERS = {
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
export const createRenderer = (rootType, parser) => (rootNode) => {
    if (Store.getIsRendering()) {
        throw new Error('Store is already rendering.');
    }
    const elementParser = (intrinsicElement, context) => {
        return parser(ELEMENT_RENDERERS[intrinsicElement.type](intrinsicElement.props, context), context);
    };
    try {
        Store.initGlobal();
        const context = {
            type: rootType,
            renderChild: (node, types) => {
                const intrinsicElements = renderNode(node).map((element) => {
                    return asIntrinsicElement(element, types);
                });
                if (intrinsicElements.length > 1) {
                    throw new TypeError('Expected node to return no more than one value.');
                }
                return elementParser(intrinsicElements[0], {
                    ...context,
                    type: intrinsicElements[0].type,
                });
            },
            renderChildren: (node, types) => {
                return renderNode(node).map((element) => {
                    assertIntrinsicElement(element, types);
                    return elementParser(element, {
                        ...context,
                        type: element.type,
                    });
                });
            },
        };
        return context.renderChild(rootNode, [rootType]);
    }
    finally {
        Store.completeGlobal();
    }
};
//# sourceMappingURL=renderer.js.map