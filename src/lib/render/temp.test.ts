import { test } from 'vitest';
import { mockDocumentElement } from 'src/mocks/mockDocument';
import { createRenderer } from './createRenderer';

test('temp', () => {
  try {
    const result = createRenderer((type, value) => ({ type, value }))(
      mockDocumentElement,
    );
    if (result) {
      console.log('RESULT\n\n', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    throw new Error(err.message);
  }
});
