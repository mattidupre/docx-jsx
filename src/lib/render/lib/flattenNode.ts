import { type ReactNode } from 'react';
import { Store } from './Store';
import {
  isNullish,
  isStringish,
  isComponentElement,
  isOtherElement,
  isIntrinsicElement,
  createIntrinsicElement,
  type IntrinsicElement,
} from 'src/entities';

export const flattenNode = (
  currentNode: ReactNode,
  isRoot = true,
): ReadonlyArray<IntrinsicElement> => {
  if (isRoot) {
    try {
      Store.initGlobal();
      return flattenNode(currentNode, false);
    } finally {
      Store.completeGlobal();
    }
  }

  if (Array.isArray(currentNode)) {
    return currentNode.flatMap((childNode) => flattenNode(childNode));
  }

  if (isComponentElement(currentNode)) {
    Store.initNode();
    try {
      return flattenNode(currentNode.type(currentNode.props), false);
    } finally {
      Store.completeNode();
    }
  }

  if (isOtherElement(currentNode)) {
    return flattenNode(currentNode.props?.children, false);
  }

  if (isNullish(currentNode)) {
    return [];
  }

  if (isStringish(currentNode)) {
    return flattenNode(
      createIntrinsicElement('text', { text: String(currentNode) }),
      false,
    );
  }

  if (isIntrinsicElement(currentNode)) {
    return [currentNode];
  }

  throw new Error('Invalid Element.');
};
