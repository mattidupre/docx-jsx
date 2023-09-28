import { mockDocumentElement } from 'src/helpers/mockDocument';
import { renderDocument } from './renderDocument';
import { test } from 'vitest';

const MOCK_ENVIRONMENT = 'test';

test('todo', () => {
  console.log(
    renderDocument(
      MOCK_ENVIRONMENT,
      mockDocumentElement,
      ({ element: { type, props }, render }) => {
        if (type === 'primitive') {
          return props.children;
        }
        return render(props.children);
      },
    ),
  );
});
