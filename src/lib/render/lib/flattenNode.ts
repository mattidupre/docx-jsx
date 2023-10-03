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
): ReadonlyArray<IntrinsicElement> => {
  if (Array.isArray(currentNode)) {
    return currentNode.flatMap((childNode) => flattenNode(childNode));
  }

  if (isComponentElement(currentNode)) {
    Store.initNode();
    try {
      return flattenNode(currentNode.type(currentNode.props));
    } finally {
      Store.completeNode();
    }
  }

  if (isOtherElement(currentNode)) {
    return flattenNode(currentNode.props?.children);
  }

  if (isNullish(currentNode)) {
    return [];
  }

  if (isStringish(currentNode)) {
    return flattenNode(
      createIntrinsicElement('text', { text: String(currentNode) }),
    );
  }

  if (isIntrinsicElement(currentNode, undefined)) {
    return [currentNode];
  }

  throw new Error('Invalid Element.');
};
