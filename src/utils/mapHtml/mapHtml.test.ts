import { describe, expect, test } from 'vitest';
import { createMockHtml } from '../../fixtures/mockDocument';
import { mapHtml } from './mapHtml';

type Context = {
  prevTagNames: string[];
};

type MappedElement = {
  tagName: string;
  path: ReadonlyArray<string>;
  children: ReadonlyArray<MappedNode>;
};

type MappedNode = string | MappedElement;

const isMappedElement = (node: MappedNode): node is MappedElement =>
  typeof node !== 'string';

const toTree = (html: string): ReadonlyArray<MappedNode> =>
  mapHtml<Context, MappedNode>(html, {
    onElementBeforeChildren: ({
      htmlElement: { tagName },
      parentContext = { prevTagNames: [] },
    }) => ({
      ...parentContext,
      prevTagNames: [...parentContext.prevTagNames, tagName],
    }),
    onText: ({ text }) => text,
    onElementAfterChildren: ({ childContext: { prevTagNames }, children }) => ({
      tagName: prevTagNames[prevTagNames.length - 1],
      path: prevTagNames,
      children,
    }),
  });

const flattenElements = (
  nodes: ReadonlyArray<MappedNode>,
): ReadonlyArray<MappedElement> =>
  nodes
    .filter(isMappedElement)
    .flatMap((element) => [element, ...flattenElements(element.children)]);

const flattenText = (nodes: ReadonlyArray<MappedNode>): string =>
  nodes
    .map((node) => (isMappedElement(node) ? flattenText(node.children) : node))
    .join('');

describe('mapHtml', () => {
  test('maps elements and text depth-first', () => {
    expect(toTree('<div><p>Hello <em>world</em></p></div>')).toEqual([
      {
        tagName: 'div',
        path: ['div'],
        children: [
          {
            tagName: 'p',
            path: ['div', 'p'],
            children: [
              'Hello ',
              {
                tagName: 'em',
                path: ['div', 'p', 'em'],
                children: ['world'],
              },
            ],
          },
        ],
      },
    ]);
  });

  test('maps every sibling at the root of a fragment', () => {
    expect(
      toTree('<p>one</p><p>two</p>').map(
        (node) => isMappedElement(node) && flattenText(node.children),
      ),
    ).toEqual(['one', 'two']);
  });

  test('drops nodes whose callback returns nothing', () => {
    const result = mapHtml<Context, string>('<p>keep</p><p>drop</p>', {
      onElementBeforeChildren: ({
        htmlElement: { tagName },
        parentContext = { prevTagNames: [] },
      }) => ({ prevTagNames: [...parentContext.prevTagNames, tagName] }),
      onText: ({ text }) => (text === 'drop' ? '' : text),
      onElementAfterChildren: ({ children }) => children,
    });
    expect(result).toEqual(['keep']);
  });

  test('maps the mock document fixture', () => {
    const tree = toTree(createMockHtml());

    // The fixture renders as a fragment, so every root node is an element.
    expect(tree.every(isMappedElement)).toBe(true);
    expect(
      tree.map((node) => isMappedElement(node) && node.path),
    ).toContainEqual(['div']);

    const elements = flattenElements(tree);
    expect(elements.length).toBeGreaterThan(100);
    expect(
      elements.every(({ tagName, path }) => path[path.length - 1] === tagName),
    ).toBe(true);

    // `<b><b> Text</b>` in the fixture sits inside a paragraph.
    const boldElements = elements.filter(({ tagName }) => tagName === 'b');
    expect(boldElements.length).toBeGreaterThan(0);
    for (const { path } of boldElements) {
      expect(path).toContain('p');
    }

    const text = flattenText(tree);
    expect(text).toContain('Heading 1');
    expect(text).toContain('Generated at 12:00:00 AM');
    expect(text).toContain('mockParagraphVariant Paragraph');
  });
});
