import { describe, expect, test } from 'vitest';
import type { DocumentType } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import { List, ListItem, type ListProps } from './List';

const renderList = (
  props: Omit<ListProps, 'children'> = {},
  documentType: DocumentType = 'web',
) =>
  reactToHtml(
    () => (
      <ContentProvider>
        <List {...props}>
          <ListItem>First</ListItem>
          <ListItem>Second</ListItem>
        </List>
      </ContentProvider>
    ),
    documentType,
  );

describe('List', () => {
  test('renders a ul with bullets by default', () => {
    const html = renderList();
    expect(html.startsWith('<ul ')).toBe(true);
    expect(html).toContain('list-style-type:disc');
    expect(html).toContain('<li ');
    expect(html).toContain('>First</li>');
  });

  test('renders an ol when it is ordered', () => {
    const html = renderList({ ordered: true });
    expect(html.startsWith('<ol ')).toBe(true);
    expect(html).toContain('list-style-type:decimal');
    expect(html).toContain('type="1"');
  });

  test('treats a numbered format as ordered without being told', () => {
    expect(renderList({ format: 'lowerRoman' }).startsWith('<ol ')).toBe(true);
    expect(renderList({ format: 'bullet' }).startsWith('<ul ')).toBe(true);
  });

  const FORMAT_STYLES = [
    ['decimal', 'decimal', '1'],
    ['lowerLetter', 'lower-alpha', 'a'],
    ['upperLetter', 'upper-alpha', 'A'],
    ['lowerRoman', 'lower-roman', 'i'],
    ['upperRoman', 'upper-roman', 'I'],
  ] as const;

  for (const [format, styleType, olType] of FORMAT_STYLES) {
    test(`draws ${format} markers as list-style-type ${styleType}`, () => {
      const html = renderList({ format });
      expect(html).toContain(`list-style-type:${styleType}`);
      // A reader that ignores CSS still numbers the list from the attribute.
      expect(html).toContain(`type="${olType}"`);
    });
  }

  test('writes the start attribute, which CSS cannot express', () => {
    expect(renderList({ ordered: true, start: 4 })).toContain('start="4"');
    // The default start is the browser's own, so it is left out.
    expect(renderList({ ordered: true })).not.toContain('start=');
    expect(renderList({ start: 4 })).not.toContain('start=');
  });

  test('indents by the amount it was given', () => {
    expect(renderList({ indent: '0.25in' })).toContain('padding-left:0.25in');
    expect(renderList()).not.toContain('padding-left');
  });

  test('carries its options to the parsers outside the web target', () => {
    const html = renderList({ format: 'lowerRoman', start: 3 }, 'docx');
    expect(html).toContain('data-matti-docs-element-type="list"');
    expect(html).toContain(
      `data-matti-docs-element-options="${encodeURI(
        JSON.stringify({ ordered: true, format: 'lowerRoman', start: 3 }),
      )}"`,
    );
  });

  test('nests a list inside an item', () => {
    const html = reactToHtml(
      () => (
        <ContentProvider>
          <List ordered>
            <ListItem>Depth one</ListItem>
            <List format="lowerLetter">
              <ListItem>Depth two</ListItem>
            </List>
          </List>
        </ContentProvider>
      ),
      'web',
    );
    expect(html).toContain('list-style-type:lower-alpha');
    expect(html.indexOf('<ol')).toBeLessThan(html.indexOf('lower-alpha'));
  });
});

describe('ListItem', () => {
  test('applies its typography options to the item', () => {
    const html = reactToHtml(
      () => (
        <ContentProvider>
          <List>
            <ListItem fontWeight="bold">Bold item</ListItem>
          </List>
        </ContentProvider>
      ),
      'web',
    );
    expect(html).toContain('font-weight:bold');
  });
});
