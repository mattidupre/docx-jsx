import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { pick } from 'lodash-es';

type Context = Record<string | number | symbol, unknown>;

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

export type MapHtmlElementBeforeChildren<TContext extends Context> = {
  parentContext: TContext;
};

export type MapTextBeforeChildren<TContext extends Context> = {
  parentContext: TContext;
};

export type MapHtmlElementAfterChildren<
  TContext extends Context,
  TMappedNode,
> = {
  childContext: TContext;
  parentContext: TContext;
  children: Array<TMappedNode>;
};

type Options<TContext extends Context, TMappedNode> = {
  initialContext: TContext;

  onElementBeforeChildren: (
    node: MapElement,
    data: MapHtmlElementBeforeChildren<TContext>,
  ) => TContext;

  onText: (
    node: MapText,
    data: MapTextBeforeChildren<TContext>,
  ) => TMappedNode | ReadonlyArray<TMappedNode>;

  onElementAfterChildren: (
    node: MapElement,
    data: MapHtmlElementAfterChildren<TContext, TMappedNode>,
  ) => TMappedNode | ReadonlyArray<TMappedNode>;
};

const mapHast = <TMappedNode>(
  nodes: unknown[],
  parentContext: unknown,
  options: Options<any, any>,
): TMappedNode[] => {
  // TODO: Constructor root from return instead of just returning flattened array.

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

      const children = node.children
        ? mapHast(node.children, childContext, options).flat()
        : [];

      const mappedElement = options.onElementAfterChildren(element, {
        parentContext,
        childContext,
        children,
      });

      return mappedElement;
    }
    return [];
  });
};

export const mapHtml = <TContext extends Context, TNode>(
  html: string,
  options: Options<TContext, TNode>,
): TNode[] => {
  const hast = fromHtmlIsomorphic(html, { fragment: true });
  return mapHast(hast.children, options.initialContext, options);
};
