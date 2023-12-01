import { test, beforeEach } from 'vitest';
import { parseReact } from './parseReact.js';
import { mockDocument } from 'src/fixtures/mockDocument';

test('TEMP', async () => {
  const result = await parseReact(mockDocument, {
    initialContext: {
      prevTagNames: [] as Array<string>,
    },
    onNodeBeforeChildren: ({ type, tagName }, { parentContext }) => {
      if (type === 'text') {
        return parentContext;
      }
      return {
        ...parentContext,
        prevTagNames: [...parentContext.prevTagNames, tagName],
      };
    },
    onNodeAfterChildren: (node, { parentContext, children }) => {
      console.log(node.tagName ?? node.value);
      console.log(parentContext.prevTagNames);
      console.log('--');
    },
  });
});
