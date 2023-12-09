import { test, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapHtml } from './mapHtml.js';
import { mockDocument } from 'src/fixtures/mockDocument';

const mockHtml = renderToStaticMarkup(mockDocument);

type Context = {
  prevTagNames: string[];
};

test('TEMP', () => {
  const result = mapHtml<Context, unknown>(mockHtml, {
    initialContext: {
      prevTagNames: [] as Array<string>,
    },
    onElementBeforeChildren: ({ type, tagName }, { parentContext }) => ({
      ...parentContext,
      prevTagNames: [...parentContext.prevTagNames, tagName],
    }),
    onText: ({ value }) => {
      return value;
    },
    onElementAfterChildren: (node, { parentContext, children }) => {
      return { children };
    },
  });

  console.log(JSON.stringify(result, undefined, 2));
});
