import { type ReactNode } from 'react';
import { Store } from './Store';
import {
  type RenderEnvironment,
  type IntrinsicElement,
  isNullish,
  isStringish,
  isIntrinsicElement,
  isComponentElement,
  isOtherElement,
  createIntrinsicString,
} from '../entities';
import { asArray } from 'src/utils';

type ParentElement = null | IntrinsicElement;

export type RenderContext<
  TReturn = unknown,
  TRenderEnvironment extends RenderEnvironment = RenderEnvironment,
> = Readonly<{
  render: (node: ReactNode) => TReturn | ReadonlyArray<TReturn>;
  element: IntrinsicElement;
  isRoot: boolean;
  parentElement: ParentElement;
  environment: TRenderEnvironment;
}>;

export type RenderCallback<
  TReturn = unknown,
  TRenderEnvironment extends RenderEnvironment = RenderEnvironment,
> = (
  context: RenderContext<TReturn, TRenderEnvironment>,
) => TReturn | ReadonlyArray<TReturn>;

export const renderNode = <
  TReturn,
  TRenderEnvironment extends RenderEnvironment,
>(
  environment: TRenderEnvironment,
  currentNode: ReactNode,
  callback: RenderCallback<TReturn, TRenderEnvironment>,
  parentElement: ParentElement = null,
  isChild: never = false as never,
): ReadonlyArray<TReturn> => {
  const renderChild = (childNode: ReactNode, childParent: ParentElement) =>
    renderNode(environment, childNode, callback, childParent, true as never);

  if (isChild !== true) {
    try {
      Store.initGlobal(environment);
      return renderChild(currentNode, parentElement);
    } finally {
      Store.completeGlobal();
    }
  }

  try {
    if (Array.isArray(currentNode)) {
      return currentNode.flatMap((childNode) =>
        renderChild(childNode, parentElement),
      );
    }

    if (isComponentElement(currentNode)) {
      return renderChild(currentNode.type(currentNode.props), parentElement);
    }

    if (isNullish(currentNode)) {
      return [];
    }

    if (isOtherElement(currentNode)) {
      return renderChild(currentNode.props?.children, parentElement);
    }

    if (isStringish(currentNode)) {
      return renderChild(createIntrinsicString(currentNode), parentElement);
    }

    if (isIntrinsicElement(currentNode)) {
      return asArray(
        callback({
          render: (childNode) => renderChild(childNode, currentNode),
          element: currentNode,
          isRoot: parentElement === null,
          parentElement,
          environment,
        }),
      ) as Array<TReturn>;
    }

    throw new Error('Invalid Element.');
  } finally {
    Store.completeNode();
  }
};
