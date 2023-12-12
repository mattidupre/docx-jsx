import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { mockDocument } from '../../fixtures/mockDocument';
import { mapHtml } from './mapHtml.js';

const mockHtml = renderToStaticMarkup(mockDocument);

type Context = {
  prevTagNames: string[];
};

test('runs without error', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = mapHtml<Context, unknown>(mockHtml, {
    initialContext: {
      prevTagNames: [] as Array<string>,
    },
    onElementBeforeChildren: ({ htmlElement: { tagName }, parentContext }) => ({
      ...parentContext,
      prevTagNames: [...parentContext.prevTagNames, tagName],
    }),
    onText: ({ text }) => {
      return text;
    },
    onElementAfterChildren: ({ children }) => {
      return { children };
    },
  });

  // console.log(JSON.stringify(result, undefined, 2));
});
