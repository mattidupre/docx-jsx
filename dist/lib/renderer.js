import { Store } from 'src/lib/store';
import { isIntrinsicElement, isAnyElement, isComponentElement, assertIntrinsicElement, asIntrinsicElement, } from 'src/entities';
import { mapObjectValues } from 'src/utils';
import { createElement } from 'react';
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
const renderStringish = (stringish) => {
    return createElement('textrun', { text: String(stringish) });
};
export const renderNode = (currentNode) => {
    if (Array.isArray(currentNode)) {
        return currentNode.flatMap((childNode) => renderNode(childNode));
    }
    if (isComponentElement(currentNode)) {
        Store.initNode();
        try {
            return renderNode(currentNode.type(currentNode.props));
        }
        finally {
            Store.completeNode();
        }
    }
    if (isAnyElement(currentNode)) {
        return renderNode(currentNode.props?.children);
    }
    if (currentNode === undefined ||
        currentNode === null ||
        currentNode === true ||
        currentNode === false) {
        return [];
    }
    if (typeof currentNode === 'number' || typeof currentNode === 'string') {
        return renderNode(renderStringish(currentNode));
    }
    if (isIntrinsicElement(currentNode, undefined)) {
        return [currentNode];
    }
    throw new Error('Invalid Element.');
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