import * as Hast from 'hast';
import { reactToHast } from './reactToHast.js';
import { type ReactElement } from 'react';

type Context = Record<string | number | symbol, unknown>;

type MappedNode = Record<string | number | symbol, unknown>;

type DocumentNode =
  | {
      type: 'text';
      tagName?: undefined;
      properties?: undefined;
      value: string;
    }
  | {
      type: 'element';
      tagName: string;
      properties: Record<string, unknown>;
      value?: string;
    };

type HastNode = Hast.Element | Hast.Text;

type Options<TContext, TMappedNode> = {
  initialContext: TContext;
  onNodeBeforeChildren: (
    node: DocumentNode,
    data: { parentContext: TContext },
  ) => false | TContext;
  onNodeAfterChildren: (
    node: DocumentNode,
    data: {
      childContext: TContext;
      parentContext: TContext;
      children?: TMappedNode[];
    },
  ) => void | undefined | TMappedNode;
};

const parseNode = (node: HastNode): DocumentNode => {
  if (node.type === 'text') {
    return {
      type: 'text',
      value: node.value,
    };
  }
  if (node.type === 'element') {
    return {
      type: 'element',
      tagName: node.tagName,
      properties: node.properties,
    };
  }
  throw new TypeError('Invalid HAST node.');
};

const mapHast = <TContext extends Context, TMappedNode extends MappedNode>(
  nodes: HastNode[],
  parentContext: TContext,
  options: Omit<Options<TContext, TMappedNode>, 'initialContext'>,
): TMappedNode[] => {
  return nodes.flatMap((node) => {
    const parsedNode = parseNode(node);
    const childContext = options.onNodeBeforeChildren(parsedNode, {
      parentContext,
    });
    if (childContext === false) {
      return [];
    }
    const children =
      'children' in node &&
      mapHast(node.children as HastNode[], childContext, options);
    const mappedNode = options.onNodeAfterChildren(parsedNode, {
      parentContext,
      childContext,
      children: children || undefined,
    });
    if (mappedNode === undefined) {
      return [];
    }
    return mappedNode;
  }) as TMappedNode[];
};

export const parseReact = async <
  TContext extends Context,
  TMappedNode extends MappedNode,
>(
  element: ReactElement,
  { initialContext, ...options }: Options<TContext, TMappedNode>,
) => {
  const hast = await reactToHast(element);
  return mapHast(hast.children as HastNode[], initialContext, options).flat();
};
