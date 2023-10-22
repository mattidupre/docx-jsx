import { Store } from 'src/lib/store';
import { type Parser } from 'src/lib/parse';
import { type ReactNode } from 'react';
import { renderNode } from './renderNode';
import { mapChildren } from './mapChildren';

export const createRenderer = (parser: Parser) => (rootNode: ReactNode) => {
  if (Store.getIsRendering()) {
    throw new Error('Store is already rendering.');
  }

  try {
    Store.initGlobal();

    const rootElements = renderNode(rootNode);
    if (rootElements.length !== 1) {
      throw new TypeError('Expected exactly one root element.');
    }

    return mapChildren(
      rootElements[0].props,
      (node) => {
        return renderNode(node);
      },
      ({ type, props }) => parser(type, props),
      'document',
    );
  } finally {
    Store.completeGlobal();
  }
};
