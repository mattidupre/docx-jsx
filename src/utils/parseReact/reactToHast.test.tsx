import { test, expect, beforeEach } from 'vitest';
import { mockDocument } from 'src/fixtures/mockDocument';
import { reactToHast } from './reactToHast.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { toHtml } from 'hast-util-to-html';

let mockResult: Awaited<ReturnType<typeof reactToHast>>;
beforeEach(async () => {
  mockResult = await reactToHast(mockDocument);
});

test('renders to an AST', async () => {
  expect(mockResult).toBeObject();
});

test('AST renders to HTML equalling renderToStaticMarkup HTML', () => {
  const reactHtml = renderToStaticMarkup(mockDocument);
  expect(toHtml(mockResult)).toEqual(reactHtml);
});
