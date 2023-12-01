import { test, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapHtml } from './mapHtml.js';
import { mockDocument } from 'src/fixtures/mockDocument';

const mockHtml = renderToStaticMarkup(mockDocument);

test('TEMP', () => {
  const result = mapHtml(mockHtml, {
    initialContext: {
      prevTagNames: [] as Array<string>,
    },
    onElementBeforeChildren: ({ type, tagName }, { parentContext }) => ({
      ...parentContext,
      prevTagNames: [...parentContext.prevTagNames, tagName],
    }),
    onText: ({ value }) => {
      // console.log(value);
      return false;
    },
    onElementAfterChildren: (node, { parentContext, children }) => {
      // console.log(node.tagName);
      // console.log(parentContext.prevTagNames);
      // console.log('--');
      return false;
    },
  });
});
