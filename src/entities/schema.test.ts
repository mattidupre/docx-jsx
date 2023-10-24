import { test } from 'vitest';
import { schema } from './schema';
import { renderNode } from 'src/lib/renderer/renderNode';
import { mockDocumentElement } from 'src/mocks/mockDocument';
import { Store } from 'src/lib/store';
import { type ReactNode } from 'react';

const render = schema<Record<string, 'CHILD'>, Record<string, 'CHILDREN'>>(
  (
    node,
    { elementDefinition: { nodeType, elementTypes, required }, encodeElement },
  ) => {
    const elements = renderNode(node);

    elements.forEach(({ type }) => {
      if (!elementTypes.includes(type)) {
        throw new TypeError(
          `Expected child element "${type}" to be of type "${elementTypes.join(
            ' or ',
          )}".`,
        );
      }
    });

    if (required && elements.length === 0) {
      throw new TypeError('At least one child element required.');
    }

    if (nodeType === 'child') {
      if (elements.length > 1) {
        throw new TypeError('Received more than one child element.');
      }
      return encodeElement(elements[0]);
    }

    if (nodeType === 'children') {
      return elements.map((element) => encodeElement(element));
    }

    throw new TypeError(`Invalid nodeType "${nodeType}".`);
  },
);

const renderDocument = (node: ReactNode) => {
  if (Store.getIsRendering()) {
    throw new Error('Store is already rendering.');
  }

  try {
    Store.initGlobal();
    return render(node, 'document');
  } finally {
    Store.completeGlobal();
  }
};

test('TODO', () => {
  const result = renderDocument(mockDocumentElement);
  if (result) {
    // console.log('RESULT\n\n', JSON.stringify(result, null, 2));
  }
});
