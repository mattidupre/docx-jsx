import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mapHtml } from './mapHtml.js';
import { mockDocument } from '../../fixtures/mockDocument';

const mockHtml = renderToStaticMarkup(mockDocument);

type Context = {
  prevTagNames: string[];
};

test('runs without error', () => {
  const result = mapHtml<Context, unknown>(mockHtml, {
    initialContext: {
      prevTagNames: [] as Array<string>,
    },
    onElementBeforeChildren: ({
      htmlElement: { type, tagName },
      parentContext,
    }) => ({
      ...parentContext,
      prevTagNames: [...parentContext.prevTagNames, tagName],
    }),
    onText: ({ text }) => {
      return text;
    },
    onElementAfterChildren: ({ parentContext, children }) => {
      return { children };
    },
  });

  // console.log(JSON.stringify(result, undefined, 2));
});
