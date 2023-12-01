import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { pick } from 'lodash-es';

type Context = Record<string | number | symbol, unknown>;

type MappedNode = Record<string | number | symbol, unknown>;

export type MapElement = {
  type: 'element';
  tagName: keyof JSX.IntrinsicElements;
  properties: Record<string, unknown>;
  children?: Array<MapElement | MapText>;
};

const isMapElement = (value: any): value is MapElement =>
  value?.type === 'element';

export type MapText = {
  type: 'text';
  value: string;
};

const isMapText = (value: any): value is MapText => value?.type === 'text';

type Options<TContext, TMappedNode> = {
  initialContext: TContext;

  onElementBeforeChildren: (
    node: MapElement,
    data: { parentContext: TContext },
  ) => undefined | false | TContext;

  onText: (
    node: MapText,
    data: { parentContext: TContext },
  ) => undefined | false | TMappedNode;

  onElementAfterChildren: (
    node: MapElement,
    data: {
      childContext: TContext;
      parentContext: TContext;
      children?: Array<TMappedNode>;
    },
  ) => undefined | false | TMappedNode;
};

const mapHast = <TMappedNode extends MappedNode>(
  nodes: unknown[],
  parentContext: unknown,
  options: Options<any, any>,
): TMappedNode[] => {
  return nodes.flatMap((node) => {
    if (isMapText(node)) {
      const mappedText = options.onText(pick(node, ['type', 'value']), {
        parentContext,
      });

      if (!mappedText) {
        return [];
      }

      return mappedText;
    }
    if (isMapElement(node)) {
      const element = pick(node, ['type', 'properties', 'tagName']);

      const childContext = options.onElementBeforeChildren(element, {
        parentContext,
      });

      // Treat element as null, don't continue down tree.
      if (childContext === false) {
        return [];
      }

      const children = node.children
        ? mapHast(node.children, childContext, options)
        : undefined;

      const mappedElement = options.onElementAfterChildren(element, {
        parentContext,
        childContext,
        children,
      });

      // Treat element as a fragment.
      if (mappedElement === undefined) {
        return children;
      }

      // Treat element as a null, don't include children.
      if (mappedElement === false) {
        return [];
      }

      return mappedElement;
    }
    return [];
  });
};

export const mapHtml = <
  TContext extends Context,
  TMappedNode extends MappedNode,
>(
  html: string,
  options: Options<TContext, TMappedNode>,
): TMappedNode[] => {
  const hast = fromHtmlIsomorphic(html, { fragment: true });
  return mapHast(hast.children, options.initialContext, options);
};
