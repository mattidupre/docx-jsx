import { test } from 'vitest';
import { createMockHtml } from '../../fixtures/mockDocument';
import { mapHtml } from './mapHtml';

const mockHtml = createMockHtml();

type Context = {
  prevTagNames: string[];
};

test('runs without error', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = mapHtml<Context, unknown>(mockHtml, {
    onElementBeforeChildren: ({
      htmlElement: { tagName },
      parentContext = { prevTagNames: [] },
    }) => ({
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
});
