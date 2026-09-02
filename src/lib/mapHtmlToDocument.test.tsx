import type { ReactElement } from 'react';
import { describe, expect, test } from 'vitest';
import {
  type DocumentElement,
  type ElementType,
  PARAGRAPH_TAG_NAMES,
} from '../entities';
import { isValueInArray } from '../utils/array';
import { BreakAvoid } from '../reactComponents/BreakAvoid';
import { DocumentProvider } from '../reactComponents/DocumentProvider';
import { Split } from '../reactComponents/Split';
import { Stack } from '../reactComponents/Stack';
import { Typography } from '../reactComponents/Typography';
import { reactToHtml } from './reactToHtml';
import {
  type HtmlElementNode,
  type ParseHtmlNode,
  mapHtmlToDocument,
} from './mapHtmlToDocument';

type MappedElement = {
  elementType: ElementType;
  tagName: string;
  children: ReadonlyArray<unknown>;
};

const isMappedElement = (value: unknown): value is MappedElement =>
  typeof value === 'object' && value !== null && 'elementType' in value;

const toMappedElement = (node: HtmlElementNode): MappedElement => ({
  elementType: node.data.element.elementType,
  tagName: node.tagName,
  children: node.children,
});

/**
 * Mirrors the DOM parser: every element maps to exactly one node.
 */
const domLikeParseNode: ParseHtmlNode = (node) => {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'root') {
    return node.children.flat();
  }
  return toMappedElement(node);
};

/**
 * Mirrors the DOCX parser: an element it has no branch for (a plain `div`) is
 * replaced by its children, so a wrapper can map to any number of nodes.
 */
const docxLikeParseNode: ParseHtmlNode = (node) => {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.type === 'root') {
    return node.children.flat();
  }
  if (
    node.data.element.elementType === 'htmltag' &&
    !isValueInArray(node.tagName, PARAGRAPH_TAG_NAMES)
  ) {
    return node.children;
  }
  return toMappedElement(node);
};

const mapDocument = (
  element: ReactElement,
  parseNode: ParseHtmlNode,
): DocumentElement<ReadonlyArray<unknown>> =>
  mapHtmlToDocument(reactToHtml(() => element, 'pdf'), parseNode);

const contentOf = (element: ReactElement, parseNode: ParseHtmlNode) => {
  const { stacks } = mapDocument(element, parseNode);
  expect(stacks, 'stacks').toHaveLength(1);
  return stacks[0].content;
};

const textOf = (node: unknown): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (isMappedElement(node)) {
    return node.children.map(textOf).join('');
  }
  return '';
};

const onlyMappedElement = (children: ReadonlyArray<unknown>): MappedElement => {
  expect(children, 'mapped children').toHaveLength(1);
  const [child] = children;
  if (!isMappedElement(child)) {
    throw new TypeError('Expected a mapped element.');
  }
  return child;
};

describe('mapHtmlToDocument line breaks', () => {
  test('drops a line break between blocks without reprocessing the parent', () => {
    const wrapper = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <BreakAvoid>
              <Typography as="p">First</Typography>
              <br />
              <Typography as="p">Second</Typography>
            </BreakAvoid>
          </Stack>
        </DocumentProvider>,
        domLikeParseNode,
      ),
    );

    // Returning the parent context for the line break used to emit a second,
    // empty copy of the wrapper here.
    expect(wrapper.children).toHaveLength(2);
    expect(wrapper.children.map(textOf)).toEqual(['First', 'Second']);
  });

  test('keeps the stack content around a line break between blocks', () => {
    const content = contentOf(
      <DocumentProvider>
        <Stack>
          <Typography as="p">First</Typography>
          <br />
          <Typography as="p">Second</Typography>
        </Stack>
      </DocumentProvider>,
      domLikeParseNode,
    );

    expect(content).toHaveLength(2);
    expect(content.map(textOf)).toEqual(['First', 'Second']);
  });

  test('keeps a line break inside a paragraph', () => {
    const paragraph = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <Typography as="p">
              First
              <br />
              Second
            </Typography>
          </Stack>
        </DocumentProvider>,
        domLikeParseNode,
      ),
    );

    expect(paragraph.children).toHaveLength(3);
    expect(paragraph.children[1]).toMatchObject({ tagName: 'br' });
    expect(textOf(paragraph)).toBe('FirstSecond');
  });
});

describe('mapHtmlToDocument split', () => {
  test('maps a side that renders several nodes to a single child', () => {
    const split = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <Split
              left={
                <>
                  <Typography as="p">A</Typography>
                  <Typography as="p">B</Typography>
                </>
              }
              right={<Typography as="p">C</Typography>}
            />
          </Stack>
        </DocumentProvider>,
        docxLikeParseNode,
      ),
    );

    expect(split.elementType).toBe('split');
    expect(split.children).toHaveLength(2);
    expect(split.children.map(textOf)).toEqual(['AB', 'C']);
  });

  test('maps a side that renders nothing to a single child', () => {
    const split = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <Split left={null} right={<Typography as="p">R</Typography>} />
          </Stack>
        </DocumentProvider>,
        docxLikeParseNode,
      ),
    );

    expect(split.children).toHaveLength(2);
    expect(split.children.map(textOf)).toEqual(['', 'R']);
  });

  test('passes a side that renders one node through unwrapped', () => {
    const split = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <Split
              left={<Typography as="p">L</Typography>}
              right={<Typography as="p">R</Typography>}
            />
          </Stack>
        </DocumentProvider>,
        docxLikeParseNode,
      ),
    );

    // The DOCX parser destructures these two children straight into the two
    // cells of a table row, so neither may be wrapped in an array.
    expect(split.children.every(isMappedElement)).toBe(true);
    expect(split.children.map(textOf)).toEqual(['L', 'R']);
  });

  test('maps to two children for a parser that never flattens', () => {
    const split = onlyMappedElement(
      contentOf(
        <DocumentProvider>
          <Stack>
            <Split
              left={
                <>
                  <Typography as="p">A</Typography>
                  <Typography as="p">B</Typography>
                </>
              }
              right={<Typography as="p">C</Typography>}
            />
          </Stack>
        </DocumentProvider>,
        domLikeParseNode,
      ),
    );

    expect(split.children).toHaveLength(2);
    expect(split.children.map(textOf)).toEqual(['AB', 'C']);
  });
});
