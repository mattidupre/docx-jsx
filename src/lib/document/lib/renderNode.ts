import { type ReactNode } from 'react';

import { callNode } from './callNode';

import { type Child, type Children } from '../entities';

type ChildFn<TChild> = (child: Child) => TChild;

type ChildrenFn<TChild, TChildren> = (
  children: ReadonlyArray<TChild>,
) => TChildren;

type RenderNode = {
  (node: ReactNode): Children;
  (node: ReactNode, options: undefined): Children;
  <TChildrenFn extends ChildrenFn<Child, unknown>>(
    node: ReactNode,
    options: {
      onChild?: never;
      onChildren: TChildrenFn;
    },
  ): ReturnType<TChildrenFn>;
  <TChildFn extends ChildFn<unknown>>(
    node: ReactNode,
    options: {
      onChild: TChildFn;
      onChildren?: never;
    },
  ): ReadonlyArray<ReturnType<TChildFn>>;
  <
    TChildFn extends ChildFn<unknown>,
    TChildrenFn extends ChildrenFn<ReturnType<TChildFn>, unknown>,
  >(
    node: ReactNode,
    options: {
      onChild: TChildFn;
      onChildren: TChildrenFn;
    },
  ): ReturnType<TChildrenFn>;
};

type Options = {
  onChild?: ChildFn<unknown>;
  onChildren?: ChildrenFn<unknown, unknown>;
};

export const renderNode: RenderNode = (
  ...args: [ReactNode] | [ReactNode, undefined | Options]
) => {
  const [node, options] = args;
  const children = callNode(node);
  if (options === undefined) {
    return children;
  }
  const childrenParsedChild = options.onChild
    ? children.flatMap((child) => options.onChild!(child))
    : children;

  const childrenParsedChildren = options.onChildren
    ? options.onChildren(childrenParsedChild)
    : childrenParsedChild;

  return childrenParsedChildren as any;
};
