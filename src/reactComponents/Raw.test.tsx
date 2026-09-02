import { describe, expect, test } from 'vitest';
import type { TagName } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { Raw } from './Raw';

const renderRaw = (as: TagName, documentType: 'web' | 'pdf' = 'web') =>
  reactToHtml(
    () => (
      <ContentProvider>
        <Raw as={as} id="raw-id">
          Raw content
        </Raw>
      </ContentProvider>
    ),
    documentType,
  );

describe('Raw', () => {
  const TAG_NAMES = ['span', 'div', 'p', 'ul'] as const;

  for (const tagName of TAG_NAMES) {
    test(`renders the ${tagName} requested by the as prop`, () => {
      const html = renderRaw(tagName);
      expect(html.startsWith(`<${tagName} `)).toBe(true);
      expect(html.endsWith(`</${tagName}>`)).toBe(true);
    });
  }

  test('does not leak the as prop as an attribute', () => {
    expect(renderRaw('span')).not.toContain('as=');
    expect(renderRaw('span', 'pdf')).not.toContain('as=');
  });

  test('passes remaining props through as attributes', () => {
    expect(renderRaw('span')).toContain('id="raw-id"');
  });

  test('marks the element as raw html for the parsers', () => {
    expect(renderRaw('span', 'pdf')).toContain(
      'data-matti-docs-element-type="htmlraw"',
    );
  });
});
