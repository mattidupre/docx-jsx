import { Store } from 'src/lib/store';
import {
  isIntrinsicElement,
  isAnyElement,
  isComponentElement,
} from 'src/entities';
import { type ReactElement, type ReactNode, createElement } from 'react';

export const renderNode = (
  currentNode: ReactNode,
): ReadonlyArray<ReactElement> => {
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

  if (isIntrinsicElement(currentNode, undefined)) {
    return [currentNode];
  }

  if (isAnyElement(currentNode)) {
    // Just pass through any other element types, i.e., React Exotic.
    return renderNode(currentNode.props?.children);
  }

  if (
    currentNode === undefined ||
    currentNode === null ||
    currentNode === true ||
    currentNode === false
  ) {
    return [];
  }

  if (typeof currentNode === 'number' || typeof currentNode === 'string') {
    return renderNode(createElement('textrun', { text: String(currentNode) }));
  }

  throw new Error('Invalid Element.');
};
