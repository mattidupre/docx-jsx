import { Store } from 'src/lib/store';
import { assertIntrinsicElement, asIntrinsicElement, } from 'src/entities';
import { renderNode } from './renderNode';
import { ELEMENT_RENDERERS } from './elementRenderers';
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
                const intrinsicElements = renderNode(node).map((element) => asIntrinsicElement(element, types));
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
//# sourceMappingURL=createRenderer.js.map