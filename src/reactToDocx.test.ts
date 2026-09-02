import JSZip from 'jszip';
import { beforeAll, describe, expect, it } from 'vitest';
import { reactToDocx } from './reactToDocx';
import {
  MOCK_BOOKMARK_ID,
  MOCK_EXTERNAL_URL,
  MockDocument,
} from './fixtures/mockDocument';
import { writeTestFile } from './fixtures/writeTestFile';
import { mockFonts } from './fixtures/mockFonts';
import {
  attribute,
  childrenOf,
  fieldCodesOf,
  findAll,
  inspectDocx,
  paragraphs,
  sections,
  styleIds,
  tables,
  textOf,
  type DocxArchive,
  type XmlNode,
  type XmlNodes,
} from './fixtures/docxInspect';

/**
 * `MockDocument` renders nine `Stack`s. Three of them supply headers and
 * footers for both the first and the subsequent page layout.
 */
const EXPECTED_SECTION_COUNT = 9;

const EXPECTED_HEADER_COUNT = 6;

const EXPECTED_FOOTER_COUNT = 6;

/**
 * `oklch(70% 0.182 40.73)` converted to sRGB.
 */
const EXPECTED_OKLCH_HEX = 'f86f38';

/** The picture parts, not the `word/media/` directory entry. */
const MEDIA_PATH_EXP = /^word\/media\/.+/;

/**
 * The `Image` is 2in wide and the swatch is twice as wide as it is tall, so the
 * derived height is 1in. `docx` writes both in EMU, 914400 to the inch.
 */
const EXPECTED_IMAGE_EXTENT = { cx: '1828800', cy: '914400' } as const;

/** `MOCK_SPACER_HEIGHT` (0.5in) in twips. */
const EXPECTED_SPACER_LINE_TWIP = '720';

const paragraphWithText = (root: XmlNode | XmlNodes, text: string): XmlNode => {
  const matched = paragraphs(root).filter(
    (paragraph) => textOf(paragraph) === text,
  );
  expect(matched, `paragraph with text "${text}"`).toHaveLength(1);
  return matched[0];
};

const runPropertyTagNames = (paragraph: XmlNode): ReadonlyArray<string> =>
  findAll(paragraph, 'w:rPr').flatMap((runProperties) =>
    childrenOf(runProperties).flatMap((property) => Object.keys(property)),
  );

/**
 * The `w:numId` a paragraph's `w:numPr` names, i.e. the numbering *instance*.
 * Two lists that draw the same markers share a definition but never an
 * instance, so this is what proves their counts stay independent.
 */
const numberingIdOf = (paragraph: XmlNode): undefined | string =>
  findAll(paragraph, 'w:numId')
    .map((numberingId) => attribute(numberingId, 'w:val'))
    .at(0);

/**
 * Level zero of the abstract numbering a `w:numId` resolves to, which is where
 * the marker format and the first number of a list are declared.
 */
const numberingLevelZero = (
  numbering: undefined | XmlNodes,
  numberingId: undefined | string,
): XmlNode => {
  expect(numbering, 'word/numbering.xml').toBeDefined();
  const instance = findAll(numbering ?? [], 'w:num').find(
    (node) => attribute(node, 'w:numId') === numberingId,
  );
  expect(instance, `w:num with w:numId "${numberingId}"`).toBeDefined();
  const abstractId = findAll(instance ?? {}, 'w:abstractNumId')
    .map((node) => attribute(node, 'w:val'))
    .at(0);
  const abstractNumbering = findAll(numbering ?? [], 'w:abstractNum').find(
    (node) => attribute(node, 'w:abstractNumId') === abstractId,
  );
  expect(
    abstractNumbering,
    `w:abstractNum with w:abstractNumId "${abstractId}"`,
  ).toBeDefined();
  const level = findAll(abstractNumbering ?? {}, 'w:lvl').find(
    (node) => attribute(node, 'w:ilvl') === '0',
  );
  expect(level, 'w:lvl with w:ilvl "0"').toBeDefined();
  return level as XmlNode;
};

const attributeOfFirst = (
  root: XmlNode | XmlNodes,
  tagName: string,
  attributeName: string,
): undefined | string =>
  findAll(root, tagName)
    .map((node) => attribute(node, attributeName))
    .at(0);

describe('reactToDocx', () => {
  let buffer: Buffer;
  let docx: DocxArchive;

  beforeAll(async () => {
    buffer = await reactToDocx(MockDocument, { fonts: mockFonts });
    await writeTestFile('reactToDocx.docx', buffer);
    docx = await inspectDocx(buffer);
  });

  it('returns a non-empty zip archive', () => {
    expect(buffer.byteLength).toBeGreaterThan(0);
    // Zip local file header magic number.
    expect([buffer[0], buffer[1]]).toEqual([0x50, 0x4b]);
    expect(docx.fileNames).toEqual(
      expect.arrayContaining([
        'word/document.xml',
        'word/styles.xml',
        'word/numbering.xml',
      ]),
    );
  });

  it('emits one section per stack', () => {
    expect(sections(docx.document)).toHaveLength(EXPECTED_SECTION_COUNT);
  });

  it('marks the stack rendered with `continuous` as a continuous section', () => {
    const continuousSections = sections(docx.document).filter((section) =>
      findAll(section, 'w:type').some(
        (type) => attribute(type, 'w:val') === 'continuous',
      ),
    );
    expect(continuousSections).toHaveLength(1);
  });

  it('references a first and a default header and footer per laid-out stack', () => {
    const headerReferences = findAll(docx.document, 'w:headerReference');
    const footerReferences = findAll(docx.document, 'w:footerReference');
    expect(headerReferences).toHaveLength(EXPECTED_HEADER_COUNT);
    expect(footerReferences).toHaveLength(EXPECTED_FOOTER_COUNT);
    expect(
      headerReferences.map((reference) => attribute(reference, 'w:type')),
    ).toEqual(['default', 'first', 'default', 'first', 'default', 'first']);
    expect(docx.headers).toHaveLength(EXPECTED_HEADER_COUNT);
    expect(docx.footers).toHaveLength(EXPECTED_FOOTER_COUNT);
  });

  it('renders page number fields into every header and footer', () => {
    for (const part of [...docx.headers, ...docx.footers]) {
      expect(fieldCodesOf(part)).toEqual(['PAGE', 'NUMPAGES']);
    }
    expect(docx.headers.map(textOf)).toEqual(
      expect.arrayContaining([
        'COVER SECTION / FIRST PAGE / HEADER TEXT  / Page  of ',
      ]),
    );
    expect(docx.footers.map(textOf)).toEqual(
      expect.arrayContaining([
        'SECOND SECTION / DEFAULT PAGE / FOOTER TEXT  / Page  of ',
      ]),
    );
  });

  it('renders each `Grid` as a borderless table', () => {
    const [twelveColumnGrid, mixedGrid] = tables(docx.document);

    expect(findAll(twelveColumnGrid, 'w:gridCol')).toHaveLength(12);
    const twelveColumnRows = findAll(twelveColumnGrid, 'w:tr');
    expect(twelveColumnRows).toHaveLength(1);
    expect(findAll(twelveColumnRows[0], 'w:tc')).toHaveLength(12);
    expect(textOf(twelveColumnRows[0])).toBe('123456789101112');

    // Sizes 6, 3, 3, 6, 7, 5 wrap into rows of 3, 2 (one filler cell) and 2.
    const mixedRows = findAll(mixedGrid, 'w:tr');
    expect(mixedRows.map((row) => findAll(row, 'w:tc').length)).toEqual([
      3, 2, 2,
    ]);
  });

  it('renders each `Split` as a two-cell borderless table', () => {
    const splitTables = tables(docx.document).slice(2);
    expect(splitTables).toHaveLength(2);
    for (const splitTable of splitTables) {
      const rows = findAll(splitTable, 'w:tr');
      expect(rows).toHaveLength(1);
      expect(findAll(rows[0], 'w:tc')).toHaveLength(2);
      expect(
        findAll(splitTable, 'w:tblBorders').flatMap((borders) =>
          childrenOf(borders).map((border) => attribute(border, 'w:val')),
        ),
      ).toEqual(['none', 'none', 'none', 'none', 'none', 'none']);
    }
    expect(textOf(splitTables[0])).toBe('Left TextRight Text');
  });

  it('declares a paragraph and a linked character style for every mock variant', () => {
    const declaredStyleIds = styleIds(docx.styles);
    expect(declaredStyleIds).toEqual(
      expect.arrayContaining([
        'mockParagraphVariant',
        'mockTextVariant',
        'mockContentVariant',
        'mockParagraphVariantChar',
        'mockTextVariantChar',
        'mockContentVariantChar',
      ]),
    );
    // Word style ids are single tokens.
    for (const styleId of declaredStyleIds) {
      expect(styleId).toMatch(/^[0-9A-Za-z]+$/);
    }
  });

  it('references the variant styles from paragraphs and runs', () => {
    const paragraphVariant = paragraphWithText(
      docx.document,
      'mockParagraphVariant Paragraph',
    );
    expect(
      findAll(paragraphVariant, 'w:pStyle').map((style) =>
        attribute(style, 'w:val'),
      ),
    ).toEqual(['mockParagraphVariant']);

    const textVariant = paragraphWithText(
      docx.document,
      'mockTextVariant Text',
    );
    expect(
      findAll(textVariant, 'w:rStyle').map((style) =>
        attribute(style, 'w:val'),
      ),
    ).toEqual(['mockTextVariantChar']);
  });

  it('emits bold and italic run properties', () => {
    expect(
      runPropertyTagNames(paragraphWithText(docx.document, 'Bold Text')),
    ).toContain('w:b');
    expect(
      runPropertyTagNames(paragraphWithText(docx.document, 'Italic Text')),
    ).toContain('w:i');
  });

  it('converts an `oklch` color to a six-digit hex value', () => {
    const colors = findAll(
      paragraphWithText(docx.document, 'OKLCH Text (Orange)'),
      'w:color',
    ).map((color) => attribute(color, 'w:val'));
    expect(colors).toHaveLength(1);
    expect(colors[0]).toMatch(/^[0-9a-f]{6}$/);
    expect(colors[0]).toBe(EXPECTED_OKLCH_HEX);
  });

  it('numbers the list items', () => {
    const { numbering } = docx;
    expect(numbering).toBeDefined();
    expect(findAll(numbering ?? [], 'w:num').length).toBeGreaterThan(0);

    const listParagraphs = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:numPr').length > 0,
    );
    expect(listParagraphs.map(textOf)).toEqual([
      'Unordered List Item Depth 1',
      'Unordered List Item Depth 1',
      'Unordered List Item Depth 2',
      'Unordered List Item Depth 2',
      'Unordered List Item Depth 1',
      'Lower Roman Item Depth 1',
      'Lower Roman Item Depth 1',
      'Lower Letter Item Depth 2',
      'Lower Letter Item Depth 2',
      'Lower Roman Item Depth 1',
      'Bulleted List Item Depth 1',
    ]);
    expect(
      listParagraphs.map((paragraph) =>
        findAll(paragraph, 'w:ilvl').map((level) => attribute(level, 'w:val')),
      ),
    ).toEqual([
      ['0'],
      ['0'],
      ['1'],
      ['1'],
      ['0'],
      ['0'],
      ['0'],
      ['1'],
      ['1'],
      ['0'],
      ['0'],
    ]);
  });

  it('gives every list its own numbering instance', () => {
    const numberingIdsByText = new Map(
      paragraphs(docx.document)
        .filter((paragraph) => findAll(paragraph, 'w:numPr').length > 0)
        .map((paragraph) => [textOf(paragraph), numberingIdOf(paragraph)]),
    );

    const unorderedId = numberingIdsByText.get('Unordered List Item Depth 1');
    const romanId = numberingIdsByText.get('Lower Roman Item Depth 1');
    const letterId = numberingIdsByText.get('Lower Letter Item Depth 2');
    const bulletId = numberingIdsByText.get('Bulleted List Item Depth 1');

    // Every list counts from its own `start`, so no two of them may share an
    // instance even when they draw the same marker.
    const numberingIds = [unorderedId, romanId, letterId, bulletId];
    expect(numberingIds.filter((id) => id !== undefined)).toHaveLength(4);
    expect(new Set(numberingIds).size).toBe(4);
  });

  it('declares the ordered list to start at three in lower roman', () => {
    const romanParagraph = paragraphs(docx.document).find(
      (paragraph) => textOf(paragraph) === 'Lower Roman Item Depth 1',
    );
    expect(romanParagraph, 'a lower roman list item').toBeDefined();
    const level = numberingLevelZero(
      docx.numbering,
      numberingIdOf(romanParagraph as XmlNode),
    );
    expect(attributeOfFirst(level, 'w:numFmt', 'w:val')).toBe('lowerRoman');
    expect(attributeOfFirst(level, 'w:start', 'w:val')).toBe('3');
  });

  it('embeds the `Image` as a drawing sized from its aspect ratio', () => {
    expect(docx.fileNames.filter((name) => MEDIA_PATH_EXP.test(name))).toEqual([
      expect.stringMatching(MEDIA_PATH_EXP),
    ]);

    const drawings = findAll(docx.document, 'w:drawing');
    expect(drawings).toHaveLength(1);

    const extents = findAll(drawings[0], 'wp:extent');
    expect(extents).toHaveLength(1);
    expect({
      cx: attribute(extents[0], 'cx'),
      cy: attribute(extents[0], 'cy'),
    }).toEqual(EXPECTED_IMAGE_EXTENT);

    // Word reads alt text off the drawing's document properties.
    expect(attributeOfFirst(drawings[0], 'wp:docPr', 'descr')).toBe(
      'Colour swatch',
    );

    // The picture is a block, so its own paragraph carries the alignment.
    expect(
      attributeOfFirst(
        paragraphs(docx.document).filter(
          (paragraph) => findAll(paragraph, 'w:drawing').length > 0,
        ),
        'w:jc',
        'w:val',
      ),
    ).toBe('center');
  });

  it('renders each `Divider` as a bordered empty paragraph', () => {
    // The one bordered paragraph that holds text is `borderBottomWidth` applied
    // as typography, not a rule.
    const dividers = paragraphs(docx.document).filter(
      (paragraph) =>
        findAll(paragraph, 'w:pBdr').length > 0 && textOf(paragraph) === '',
    );
    expect(dividers).toHaveLength(2);

    expect(
      dividers.map((divider) => ({
        style: attributeOfFirst(divider, 'w:bottom', 'w:val'),
        color: attributeOfFirst(divider, 'w:bottom', 'w:color'),
        // `w:sz` is in eighths of a point: 2px is 1.5pt, 1px is 0.75pt.
        size: attributeOfFirst(divider, 'w:bottom', 'w:sz'),
      })),
    ).toEqual([
      { style: 'single', color: '333333', size: '12' },
      { style: 'single', color: '3366cc', size: '6' },
    ]);

    // A paragraph border always runs from indent to indent, so `width={40}`
    // is a right indent of the remaining 60% of the 10800 twip content width.
    expect(attributeOfFirst(dividers[1], 'w:ind', 'w:right')).toBe('6480');
  });

  it('renders the `Spacer` as an empty paragraph of exact height', () => {
    const spacers = paragraphs(docx.document).filter(
      (paragraph) =>
        textOf(paragraph) === '' &&
        findAll(paragraph, 'w:pBdr').length === 0 &&
        attributeOfFirst(paragraph, 'w:spacing', 'w:line') ===
          EXPECTED_SPACER_LINE_TWIP,
    );
    expect(spacers).toHaveLength(1);
    expect(attributeOfFirst(spacers[0], 'w:spacing', 'w:lineRule')).toBe(
      'exact',
    );
    expect(attributeOfFirst(spacers[0], 'w:spacing', 'w:before')).toBe('0');
    expect(attributeOfFirst(spacers[0], 'w:spacing', 'w:after')).toBe('0');
  });

  it('anchors the internal link on the bookmark it points at', () => {
    const bookmarkNames = findAll(docx.document, 'w:bookmarkStart').map(
      (bookmark) => attribute(bookmark, 'w:name'),
    );
    expect(bookmarkNames).toContain(MOCK_BOOKMARK_ID);

    const hyperlinks = findAll(docx.document, 'w:hyperlink');
    const internalLinks = hyperlinks.filter(
      (hyperlink) => attribute(hyperlink, 'w:anchor') !== undefined,
    );
    expect(internalLinks).toHaveLength(1);
    expect(attribute(internalLinks[0], 'w:anchor')).toBe(MOCK_BOOKMARK_ID);
    expect(textOf(internalLinks[0])).toBe('Internal Link Text');

    // An external link carries a relationship id instead of an anchor. The
    // fixture has two: the `<a href>` and the `Link href`.
    const externalLinks = hyperlinks.filter(
      (hyperlink) => attribute(hyperlink, 'r:id') !== undefined,
    );
    expect(externalLinks.map(textOf)).toEqual([
      'Link Text',
      'External Link Text',
    ]);

    // Both kinds are styled by Word's built-in `Hyperlink` character style.
    for (const hyperlink of hyperlinks) {
      expect(attributeOfFirst(hyperlink, 'w:rStyle', 'w:val')).toBe(
        'Hyperlink',
      );
    }
  });

  it('writes the external link target into the document relationships', async () => {
    // `docxInspect` does not parse the relationship part, so this reads the
    // one fact that matters straight out of the archive: an
    // `ExternalHyperlink` is only a link if its relationship names the URL.
    const zip = await JSZip.loadAsync(buffer);
    const relationships = await zip
      .file('word/_rels/document.xml.rels')
      ?.async('string');
    expect(relationships).toContain(MOCK_EXTERNAL_URL);
    expect(relationships).toContain('TargetMode="External"');
  });
});
