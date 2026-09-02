import { describe, expect, test } from 'vitest';
import {
  type ElementData,
  type PageSize,
  decodeElementData,
} from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { mockFonts } from '../fixtures/mockFonts';
import { mapHtml } from '../utils/mapHtml/mapHtml';
import { DocumentProvider } from './DocumentProvider';
import { Stack } from './Stack';
import { Typography } from './Typography';
import { usePageSize } from './usePageSize';

const DEFAULT_SIZE: PageSize = { width: '8.5in', height: '11in' };

const CUSTOM_SIZE: PageSize = { width: '5.5in', height: '8.5in' };

/**
 * Decodes the element data every library component encodes onto its DOM node.
 */
const decodeElements = (html: string): ReadonlyArray<ElementData> => {
  const elements: Array<ElementData> = [];
  mapHtml<Record<string, never>, unknown>(html, {
    onElementBeforeChildren: ({ htmlElement }) => {
      elements.push(decodeElementData(htmlElement));
      return {};
    },
    onText: () => [],
    onElementAfterChildren: () => [],
  });
  return elements;
};

const documentOptionsOf = (html: string) => {
  const documentElements = decodeElements(html).filter(
    (element): element is ElementData<'document'> =>
      element.elementType === 'document',
  );
  expect(documentElements, 'document elements').toHaveLength(1);
  return documentElements[0].elementOptions;
};

function PageSizeProbe() {
  const { width, height } = usePageSize();
  return <Typography as="p">{`${width} by ${height}`}</Typography>;
}

describe('DocumentProvider', () => {
  test('encodes the size prop onto the document element', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider size={CUSTOM_SIZE}>
          <Stack>
            <Typography as="p">Content</Typography>
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    expect(documentOptionsOf(html).size).toEqual(CUSTOM_SIZE);
  });

  test('encodes the default size when none is given', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider>
          <Stack>
            <Typography as="p">Content</Typography>
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    expect(documentOptionsOf(html).size).toEqual(DEFAULT_SIZE);
  });

  test('exposes the size prop through usePageSize', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider size={CUSTOM_SIZE}>
          <Stack>
            <PageSizeProbe />
          </Stack>
        </DocumentProvider>
      ),
      'web',
    );

    expect(html).toContain('5.5in by 8.5in');
  });

  test('still encodes variants and prefixes alongside the size', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider
          size={CUSTOM_SIZE}
          prefixes={{ variantClassName: 'custom-variant' }}
          variants={{ heading1: { fontWeight: 'bold' } }}
        >
          <Stack>
            <Typography as="p">Content</Typography>
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    const { size, prefixes, variants } = documentOptionsOf(html);
    expect(size).toEqual(CUSTOM_SIZE);
    expect(prefixes).toEqual({
      elementClassName: 'matti-docs-element',
      variantClassName: 'custom-variant',
      cssVariable: 'matti-docs',
    });
    expect(variants.heading1).toMatchObject({ fontWeight: 'bold' });
  });

  test('encodes the fonts prop onto the document element', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider fonts={mockFonts}>
          <Stack>
            <Typography as="p">Content</Typography>
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    // Every target reads its own source out of the same config, so the whole
    // thing travels rather than a target-specific projection of it.
    expect(documentOptionsOf(html).fonts).toEqual(mockFonts);
  });

  test('encodes no fonts key when none is given', () => {
    const html = reactToHtml(
      () => (
        <DocumentProvider>
          <Stack>
            <Typography as="p">Content</Typography>
          </Stack>
        </DocumentProvider>
      ),
      'pdf',
    );

    expect(documentOptionsOf(html)).not.toHaveProperty('fonts');
  });
});
