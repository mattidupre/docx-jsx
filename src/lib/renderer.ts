import { Store } from 'src/lib/store';
import {
  type RenderContext,
  asIntrinsicElement,
  isNullish,
  isStringish,
  isComponentElement,
  isOtherElement,
  isIntrinsicElement,
  createIntrinsicElement,
  type IntrinsicElement,
  type Stringish,
  type IntrinsicType,
  type IntrinsicProps,
  type Parser,
  type ReplaceChildDeep,
} from 'src/entities';
import { mapObjectValues } from 'src/utils';
import { type ReactNode } from 'react';

export const ELEMENT_RENDERERS = {
  document: ({ children, ...options }, { renderChildren }) => ({
    ...options,
    children: renderChildren(children, ['section']),
  }),
  section: (
    { children, headers, footers },
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
  table: (props: Record<string, never>) => ({}) as Record<string, never>,
} as const satisfies {
  [K in keyof IntrinsicProps]: (
    props: IntrinsicProps[K],
    context: RenderContext<K>,
  ) => ReplaceChildDeep<IntrinsicProps[K], Record<IntrinsicType, any>>;
};

const renderStringish = (stringish: Stringish) => {
  return createIntrinsicElement('textrun', { text: String(stringish) });
};

export const renderNode = (
  currentNode: ReactNode,
): ReadonlyArray<IntrinsicElement> => {
  if (Array.isArray(currentNode)) {
    return currentNode.flatMap((childNode) => renderNode(childNode));
  }

  if (isComponentElement(currentNode)) {
    Store.initNode();
    try {
      return renderNode(currentNode.type(currentNode.props));
    } finally {
      Store.completeNode();
    }
  }

  if (isOtherElement(currentNode)) {
    return renderNode(currentNode.props?.children);
  }

  if (isNullish(currentNode)) {
    return [];
  }

  if (isStringish(currentNode)) {
    return renderNode(renderStringish(currentNode));
  }

  if (isIntrinsicElement(currentNode, undefined)) {
    return [currentNode];
  }

  throw new Error('Invalid Element.');
};

export const createRenderer =
  (rootType: 'document', parser: Parser) => (rootNode: ReactNode) => {
    if (Store.getIsRendering()) {
      throw new Error('Store is already rendering.');
    }

    const elementParser = <TType extends IntrinsicType>(
      intrinsicElement: undefined | IntrinsicElement<TType>,
      context: RenderContext<TType>,
    ) => {
      return parser(
        ELEMENT_RENDERERS[intrinsicElement.type](
          intrinsicElement.props,
          context,
        ),
        context,
      );
    };

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
          return elementParser(intrinsicElements[0], {
            ...context,
            type: intrinsicElements[0].type,
          });
        },

        renderChildren: (node, types) => {
          return renderNode(node).map((element) =>
            elementParser(asIntrinsicElement(element, types), {
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
