import {
  isNullish,
  isStringish,
  isComponentElement,
  isOtherElement,
  isIntrinsicElement,
  createIntrinsicElement,
  type IntrinsicElement,
  type Stringish,
} from '../entities';
import { type ReactNode } from 'react';
import { Store } from './renderStore';

const renderStringish = (stringish: Stringish) => {
  return createIntrinsicElement('textrun', { text: String(stringish) });
};

export const renderNode = (
  currentNode: ReactNode,
): ReadonlyArray<IntrinsicElement> => {
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

  if (isOtherElement(currentNode)) {
    return renderNode(currentNode.props?.children);
  }

  if (isNullish(currentNode)) {
    return [];
  }

  if (isStringish(currentNode)) {
    return renderNode(renderStringish(currentNode));
  }

  if (isIntrinsicElement(currentNode, undefined)) {
    return [currentNode];
  }

  throw new Error('Invalid Element.');
};
