import { Store } from './renderStore';
import { type Parser } from 'src/parse';
import { renderNode } from './renderNode';
import {
  type IntrinsicElement,
  type IntrinsicType,
  asIntrinsicElement,
} from '../entities';
import { type ReactNode } from 'react';

export type RenderContext<TType extends IntrinsicType = IntrinsicType> = {
  type: TType;

  renderChild: <TChildType extends IntrinsicType>(
    node: ReactNode,
    types: ReadonlyArray<TChildType>,
  ) => undefined | IntrinsicElement<TChildType>;

  renderChildren: <TChildType extends IntrinsicType>(
    node: ReactNode,
    types: ReadonlyArray<TChildType>,
  ) => ReadonlyArray<IntrinsicElement<TChildType>>;
};

export const createRenderer =
  (rootType: IntrinsicType, parser: Parser) => (rootNode: ReactNode) => {
    if (Store.getIsRendering()) {
      throw new Error('Store is already rendering.');
    }

    try {
      Store.initGlobal();

      const context: RenderContext = {
        type: rootType,

        renderChild: (node, types) => {
          const intrinsicElements = renderNode(node).map((element) =>
            asIntrinsicElement(element, types),
          );
          if (intrinsicElements.length > 1) {
            throw new TypeError(
              'Expected node to return no more than one value.',
            );
          }
          return parser(intrinsicElements[0], {
            ...context,
            type: intrinsicElements[0].type,
          });
        },

        renderChildren: (node, types) => {
          return renderNode(node).map((element) =>
            parser(asIntrinsicElement(element, types), {
              ...context,
              type: element.type,
            }),
          );
        },
      };

      return context.renderChild(rootNode, [rootType]);
    } finally {
      Store.completeGlobal();
    }
  };
