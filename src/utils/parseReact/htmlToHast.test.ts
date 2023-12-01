import { test, expect, beforeEach } from 'vitest';
import { mockDocument } from 'src/fixtures/mockDocument';
import { htmlToHast } from './htmlToHast.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

const mockHtml = renderToStaticMarkup(mockDocument);

let mockResult: Awaited<ReturnType<typeof htmlToHast>>;
beforeEach(async () => {
  mockResult = htmlToHast(renderToStaticMarkup(mockDocument));
});

test('renders to an AST', async () => {
  expect(htmlToHast(mockHtml)).toBeObject();
});

test('removes comments', () => {
  expect(htmlToHast(`<div><!-- COMMENT --><h1>Hello World</h1></div>`)).toEqual(
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'h1',
              properties: {},
              children: [{ type: 'text', value: 'Hello World' }],
            },
          ],
        },
      ],
    },
  );
});
