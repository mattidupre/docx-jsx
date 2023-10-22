import { Store } from 'src/lib/store';
import {
  type ReactElement,
  type ReactNode,
  createElement,
  isValidElement,
} from 'react';

export const renderNode = (
  currentNode: ReactNode,
): ReadonlyArray<ReactElement> => {
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

  if (Array.isArray(currentNode)) {
    return currentNode.flatMap((childNode) => renderNode(childNode));
  }

  if (isValidElement(currentNode)) {
    const { type, props } = currentNode;
    if (typeof type === 'function') {
      Store.initNode();
      try {
        return renderNode((type as any)(props));
      } finally {
        Store.completeNode();
      }
    }

    if (typeof type === 'string') {
      return [currentNode];
    }

    // Just pass through any other element types, i.e., React Exotic.
    return renderNode(currentNode.props?.children);
  }

  throw new Error('Invalid Element.');
};
