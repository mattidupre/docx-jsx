import { Store } from 'src/lib/store';
import { type Parser, type ParsedElement } from 'src/entities';
import { type ReactNode, createElement, isValidElement } from 'react';

const isElement = (value: any): value is ParsedElement =>
  typeof value?.type === 'string';

export const reactParser: Parser<ReactNode> = (currentNode: ReactNode) => {
  if (Array.isArray(currentNode)) {
    return currentNode.flatMap((childNode) => reactParser(childNode));
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
    // Stringish nodes get converted into Text elements.
    return reactParser(createElement('textrun', { text: String(currentNode) }));
  }

  if (isValidElement(currentNode)) {
    const { type, props } = currentNode;
    if (typeof type === 'function') {
      Store.initNode();
      try {
        return reactParser((type as any)(props));
      } finally {
        Store.completeNode();
      }
    }

    if (isElement(currentNode)) {
      return [currentNode];
    }

    // Just pass through any other element types, i.e., React Exotic.
    return reactParser(currentNode.props?.children);
  }

  throw new Error('Invalid Element.');
};
