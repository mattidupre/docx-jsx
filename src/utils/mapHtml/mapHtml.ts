import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { pick } from 'lodash-es';

type Context = Record<string | number | symbol, unknown>;

export type MappedNode = Record<string | number | symbol, unknown>;

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
  TMappedNode extends MappedNode,
> = {
  childContext: TContext;
  parentContext: TContext;
  children: Array<TMappedNode>;
};

type Options<TContext extends Context, TMappedNode extends MappedNode> = {
  initialContext: TContext;

  onElementBeforeChildren: (
    node: MapElement,
    data: MapHtmlElementBeforeChildren<TContext>,
  ) => undefined | false | TContext;

  onText: (
    node: MapText,
    data: MapTextBeforeChildren<TContext>,
  ) => undefined | false | TMappedNode;

  onElementAfterChildren: (
    node: MapElement,
    data: MapHtmlElementAfterChildren<TContext, TMappedNode>,
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
        : [];

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

export const mapHtml = <TContext extends Context, TNode extends MappedNode>(
  html: string,
  options: Options<TContext, TNode>,
): TNode[] => {
  const hast = fromHtmlIsomorphic(html, { fragment: true });
  return mapHast(hast.children, options.initialContext, options);
};