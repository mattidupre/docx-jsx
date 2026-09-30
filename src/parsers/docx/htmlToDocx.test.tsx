import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Bookmark,
  BreakAvoid,
  DocumentProvider,
  Grid,
  GridItem,
  Link,
  List,
  ListItem,
  Raw,
  Split,
  Stack,
  Svg,
  TabSplit,
  Table,
  TableCell,
  TableRow,
  Typography,
} from '../../reactComponents';
import type { FragmentationOption } from '../../entities';
import { mockFonts } from '../../fixtures/mockFonts';
import { createMockVariantsConfig } from '../../fixtures/mockVariantsConfig';
import { reactToDocx } from '../../reactToDocx';
import {
  attribute,
  childrenOf,
  findAll,
  inspectDocx,
  paragraphs,
  tables,
  tagNameOf,
  textOf,
  type DocxArchive,
  type XmlNode,
  type XmlNodes,
} from '../../fixtures/docxInspect';
import type { HtmlToDocxOptions } from './htmlToDocx';

/**
 * A 1x1 transparent PNG, the smallest thing that proves the bytes reached
 * `word/media`.
 */
const NO_BREAK_SPACE = '\u00a0';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const toDocxArchive = async (
  element: ReactElement,
  options: Omit<HtmlToDocxOptions, 'fonts'> = {},
): Promise<DocxArchive> =>
  inspectDocx(
    await reactToDocx(() => element, { fonts: mockFonts, ...options }),
  );

const paragraphStyleIds = (
  root: XmlNode | XmlNodes,
): ReadonlyArray<undefined | string> =>
  findAll(root, 'w:pStyle').map((style) => attribute(style, 'w:val'));

const runStyleIds = (
  root: XmlNode | XmlNodes,
): ReadonlyArray<undefined | string> =>
  findAll(root, 'w:rStyle').map((style) => attribute(style, 'w:val'));

const attributesOf = (
  node: XmlNode,
  attributeNames: ReadonlyArray<string>,
): Record<string, undefined | string> =>
  Object.fromEntries(
    attributeNames.map((attributeName) => [
      attributeName,
      attribute(node, attributeName),
    ]),
  );

/**
 * The tag names of everything Word reads as a direct child of the document
 * body. Anything but a block (or the section properties) means a run escaped
 * its paragraph.
 */
const bodyChildTagNames = (document: XmlNodes): ReadonlyArray<string> => {
  const [body] = findAll(document, 'w:body');
  return childrenOf(body).map(tagNameOf);
};

/**
 * `docx` writes an off switch as `w:val="false"` rather than leaving the
 * element out, so presence alone does not mean the flag is set.
 */
const isFlagSet = (root: XmlNode | XmlNodes, tagName: string): boolean =>
  findAll(root, tagName).some((flag) => attribute(flag, 'w:val') !== 'false');

const rows = (table: XmlNode): XmlNodes => findAll(table, 'w:tr');

const cells = (row: XmlNode): XmlNodes => findAll(row, 'w:tc');

const columnSpans = (table: XmlNode): ReadonlyArray<ReadonlyArray<number>> =>
  rows(table).map((row) =>
    cells(row).map((cell) =>
      Number(
        findAll(cell, 'w:gridSpan')
          .map((span) => attribute(span, 'w:val'))
          .at(0) ?? 1,
      ),
    ),
  );

describe('page properties', () => {
  it('writes the page size and the margins as whole twips', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider size={{ width: '8.5in', height: '11in' }}>
        <Stack
          margin={{
            top: '1in',
            right: '0.75in',
            bottom: '1in',
            left: '0.75in',
            header: '0.5in',
            footer: '0.5in',
          }}
        >
          <p>Letter</p>
        </Stack>
      </DocumentProvider>,
    );

    const [pageSize] = findAll(docx.document, 'w:pgSz');
    expect(attributesOf(pageSize, ['w:w', 'w:h'])).toEqual({
      'w:w': '12240',
      'w:h': '15840',
    });

    const [pageMargin] = findAll(docx.document, 'w:pgMar');
    expect(
      attributesOf(pageMargin, [
        'w:top',
        'w:right',
        'w:bottom',
        'w:left',
        'w:header',
        'w:footer',
      ]),
    ).toEqual({
      'w:top': '1440',
      'w:right': '1080',
      'w:bottom': '1440',
      'w:left': '1080',
      'w:header': '720',
      'w:footer': '720',
    });
  });

  it('rounds a length that is not a whole number of twips', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider size={{ width: '21cm', height: '29.7cm' }}>
        <Stack
          margin={{ top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }}
        >
          <p>A4</p>
        </Stack>
      </DocumentProvider>,
    );

    const [pageSize] = findAll(docx.document, 'w:pgSz');
    // 21cm is 11905.5 twips.
    expect(attributesOf(pageSize, ['w:w', 'w:h'])).toEqual({
      'w:w': '11906',
      'w:h': '16838',
    });
    expect(attribute(findAll(docx.document, 'w:pgMar')[0], 'w:top')).toBe(
      '567',
    );
  });

  it('writes the column spacing of a multi column stack as whole twips', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack columns={{ columnCount: 2, columnGap: '0.25in' }}>
          <p>Columns</p>
        </Stack>
      </DocumentProvider>,
    );

    const [columns] = findAll(docx.document, 'w:cols');
    expect(attributesOf(columns, ['w:num', 'w:space'])).toEqual({
      'w:num': '2',
      'w:space': '360',
    });
  });
});

describe('paragraph styles', () => {
  it('emits exactly one paragraph style per paragraph', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <h2>Plain heading</h2>
          <Typography as="h2" variant="heading1">
            Heading with a variant
          </Typography>
          <Typography as="div" variant="mockContentVariant">
            <ul>
              <li>List item inside a variant</li>
            </ul>
          </Typography>
        </Stack>
      </DocumentProvider>,
    );

    for (const paragraph of paragraphs(docx.document)) {
      // `w:pPr` holds at most one `w:pStyle`; a second one is invalid.
      expect(
        paragraphStyleIds(paragraph).length,
        `paragraph styles of "${textOf(paragraph)}"`,
      ).toBeLessThanOrEqual(1);
    }

    expect(paragraphStyleIds(docx.document)).toEqual([
      'Heading2',
      // The variant wins over the tag: `heading` is only a shorthand for a
      // built-in style id.
      'Heading1',
      // A numbered paragraph keeps its variant's style; `docx` only falls back
      // to `ListParagraph` when the paragraph has no style of its own.
      'mockContentVariant',
    ]);
  });

  it('gives a list item with no variant the built-in ListParagraph style', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <ul>
            <li>Plain list item</li>
          </ul>
        </Stack>
      </DocumentProvider>,
    );

    expect(paragraphStyleIds(docx.document)).toEqual(['ListParagraph']);
  });

  it('styles the runs of a list item with the variant character style', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <Typography as="div" variant="mockContentVariant">
            <ul>
              <li>List item inside a variant</li>
            </ul>
          </Typography>
        </Stack>
      </DocumentProvider>,
    );

    expect(runStyleIds(docx.document)).toEqual(['mockContentVariantChar']);
  });

  it('styles the runs of a hyperlink with the built-in Hyperlink style', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <p>
            <a href="https://example.com/">Link text</a>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    expect(findAll(docx.document, 'w:hyperlink')).toHaveLength(1);
    expect(runStyleIds(docx.document)).toEqual(['Hyperlink']);
  });
});

describe('Split', () => {
  it('renders sides of plain text, one paragraph and several paragraphs', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Split left="Plain left" right="Plain right" />
          <Split left={<p>One left</p>} right={<p>One right</p>} />
          <Split
            left={
              <>
                <p>First left</p>
                <p>Second left</p>
              </>
            }
            right={<p>Only right</p>}
          />
        </Stack>
      </DocumentProvider>,
    );

    const [plain, single, multiple] = tables(docx.document);

    expect(cells(rows(plain)[0]).map(textOf)).toEqual([
      'Plain left',
      'Plain right',
    ]);
    // Bare text has no paragraph of its own in the HTML; a table cell has to
    // have one.
    expect(
      cells(rows(plain)[0]).map((cell) => paragraphs(cell).length),
    ).toEqual([1, 1]);
    // The right side of a Split is right aligned in every target.
    expect(
      findAll(cells(rows(plain)[0])[1], 'w:jc').map((alignment) =>
        attribute(alignment, 'w:val'),
      ),
    ).toEqual(['right']);

    expect(cells(rows(single)[0]).map(textOf)).toEqual([
      'One left',
      'One right',
    ]);

    const [multipleLeft, multipleRight] = cells(rows(multiple)[0]);
    expect(paragraphs(multipleLeft).map(textOf)).toEqual([
      'First left',
      'Second left',
    ]);
    expect(paragraphs(multipleRight).map(textOf)).toEqual(['Only right']);
  });

  it('keeps every cell paragraph together inside a BreakAvoid', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <BreakAvoid>
            <Split
              left={
                <>
                  <p>First left</p>
                  <p>Second left</p>
                </>
              }
              right={<p>Only right</p>}
            />
          </BreakAvoid>
        </Stack>
      </DocumentProvider>,
    );

    const [split] = tables(docx.document);
    expect(findAll(split, 'w:cantSplit')).toHaveLength(1);
    expect(findAll(split, 'w:keepLines')).toHaveLength(
      paragraphs(split).length,
    );
  });
});

describe('Grid', () => {
  it('wraps rows at the column count of the grid', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Grid columnGap="0.25in" columnCount={4}>
            <GridItem size={1}>
              <p>1</p>
            </GridItem>
            <GridItem size={2}>
              <p>2</p>
            </GridItem>
            <GridItem size={3}>
              <p>3</p>
            </GridItem>
            <GridItem size={4}>
              <p>4</p>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
    );

    const [grid] = tables(docx.document);
    expect(findAll(grid, 'w:gridCol')).toHaveLength(4);
    // 1 and 2 fit one row, 3 and 4 each need one of their own, and every row is
    // filled out to four columns.
    expect(columnSpans(grid)).toEqual([[1, 2, 1], [3, 1], [4]]);
    expect(rows(grid).map(textOf)).toEqual(['12', '3', '4']);
  });

  it('keeps the twelve column default', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Grid columnGap="0.25in">
            <GridItem size={7}>
              <p>Seven</p>
            </GridItem>
            <GridItem size={5}>
              <p>Five</p>
            </GridItem>
            <GridItem size={8}>
              <p>Eight</p>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
    );

    const [grid] = tables(docx.document);
    expect(findAll(grid, 'w:gridCol')).toHaveLength(12);
    expect(columnSpans(grid)).toEqual([
      [7, 5],
      [8, 4],
    ]);
  });

  it('gives an item wider than the grid a row of its own', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Grid columnGap="0.25in" columnCount={4}>
            <GridItem size={2}>
              <p>Two</p>
            </GridItem>
            <GridItem size={6}>
              <p>Six</p>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
    );

    const [grid] = tables(docx.document);
    expect(columnSpans(grid)).toEqual([[2, 2], [4]]);
    expect(rows(grid).map(textOf)).toEqual(['Two', 'Six']);
  });

  it('writes whole twips for the grid and its cells', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack margin={{ left: '1in', right: '1in' }}>
          <Grid columnGap="0.25in" columnCount={4}>
            <GridItem size={2}>
              <p>Two</p>
            </GridItem>
            <GridItem size={2}>
              <p>Also two</p>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
    );

    const [grid] = tables(docx.document);
    const widths = [
      ...findAll(grid, 'w:tblW'),
      ...findAll(grid, 'w:tblInd'),
      ...findAll(grid, 'w:gridCol'),
      ...findAll(grid, 'w:tcW'),
    ].map((width) => attribute(width, 'w:w'));
    for (const width of widths) {
      expect(width).toMatch(/^-?\d+$/);
    }
    // 8.5in less two 1in margins (9360 twips), widened by the 0.25in gutter
    // the grid hangs into each margin by half of.
    expect(attribute(findAll(grid, 'w:tblW')[0], 'w:w')).toBe('9720');
  });

  it('keeps a grid with pageBreakAvoid on one page', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Grid columnGap="0.25in" columnCount={2} pageBreakAvoid>
            <GridItem size={1}>
              <p>Left</p>
            </GridItem>
            <GridItem size={1}>
              <p>Right</p>
            </GridItem>
          </Grid>
        </Stack>
      </DocumentProvider>,
    );

    const [grid] = tables(docx.document);
    expect(findAll(grid, 'w:cantSplit')).toHaveLength(rows(grid).length);
    expect(findAll(grid, 'w:keepLines')).toHaveLength(paragraphs(grid).length);
  });
});

describe('BreakAvoid', () => {
  it('keeps every descendant paragraph of a wrapper together', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <BreakAvoid>
            <div>
              <p>First</p>
              <p>Second</p>
              <p>Third</p>
            </div>
          </BreakAvoid>
          <p>After</p>
        </Stack>
      </DocumentProvider>,
    );

    const keptParagraphs = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:keepLines').length > 0,
    );
    expect(keptParagraphs.map(textOf)).toEqual(['First', 'Second', 'Third']);
    // Only the paragraphs that have another one after them inside the wrapper
    // are kept with the next block.
    expect(
      keptParagraphs.map((paragraph) => isFlagSet(paragraph, 'w:keepNext')),
    ).toEqual([true, true, false]);
  });

  it('keeps a paragraph that carries the break rule itself', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Typography as="h2" breakAfter="avoid">
            Heading
          </Typography>
          <Typography as="p" breakInside="avoid">
            Body
          </Typography>
          <p>Plain</p>
        </Stack>
      </DocumentProvider>,
    );

    const [heading, body, plain] = paragraphs(docx.document);
    expect(isFlagSet(heading, 'w:keepNext')).toBe(true);
    expect(isFlagSet(heading, 'w:keepLines')).toBe(false);
    expect(isFlagSet(body, 'w:keepLines')).toBe(true);
    expect(isFlagSet(body, 'w:keepNext')).toBe(false);
    expect(isFlagSet(plain, 'w:keepNext')).toBe(false);
    expect(isFlagSet(plain, 'w:keepLines')).toBe(false);
  });
});

describe('widow control', () => {
  it('writes widowControl into the document paragraph defaults', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <p>Text</p>
        </Stack>
      </DocumentProvider>,
    );

    const [defaults] = findAll(docx.styles, 'w:pPrDefault');
    expect(isFlagSet(defaults, 'w:widowControl')).toBe(true);
  });
});

const columnStacks = (
  fragmentation?: FragmentationOption,
  next: ReactElement = <p>Next page</p>,
) => (
  <DocumentProvider fragmentation={fragmentation}>
    <Stack columns={{ columnCount: 2, columnGap: '0.25in' }}>
      <p>First</p>
      <p>Last</p>
    </Stack>
    <Stack>{next}</Stack>
  </DocumentProvider>
);

const emptyParagraphsOf = (docx: DocxArchive) =>
  paragraphs(docx.document).filter((paragraph) => textOf(paragraph) === '');

const sectionTypes = (docx: DocxArchive) =>
  findAll(docx.document, 'w:sectPr').map((sectPr) => {
    const [type] = findAll(sectPr, 'w:type');
    return type && attribute(type, 'w:val');
  });

describe('column sections', () => {
  it('ends a column section inside its last paragraph', async () => {
    const docx = await toDocxArchive(columnStacks());

    const [columnParagraph] = paragraphs(docx.document).filter(
      (paragraph) => findAll(paragraph, 'w:cols').length > 0,
    );
    expect(textOf(columnParagraph)).toBe('Last');
  });

  it('ends columns before a new page with an ordinary empty line by default', async () => {
    const docx = await toDocxArchive(columnStacks());

    // The empty single column section that follows, so Word balances the
    // columns, is the only paragraph left without text, at its normal height.
    const emptyParagraphs = emptyParagraphsOf(docx);
    expect(emptyParagraphs).toHaveLength(1);
    expect(findAll(emptyParagraphs[0], 'w:spacing')).toHaveLength(0);
    expect(findAll(emptyParagraphs[0], 'w:cols')).toHaveLength(0);
    expect(attribute(findAll(emptyParagraphs[0], 'w:type')[0], 'w:val')).toBe(
      'continuous',
    );
  });

  it('cuts the line to one point when `endBeforePage` is `minimal`', async () => {
    const docx = await toDocxArchive(
      columnStacks({ columns: { endBeforePage: 'minimal' } }),
    );

    const emptyParagraphs = emptyParagraphsOf(docx);
    expect(emptyParagraphs).toHaveLength(1);
    const [spacing] = findAll(emptyParagraphs[0], 'w:spacing');
    expect(attributesOf(spacing, ['w:line', 'w:lineRule'])).toEqual({
      'w:line': '20',
      'w:lineRule': 'exact',
    });
  });

  it('moves the break into the next stack when `endBeforePage` is `page-break-before`', async () => {
    const docx = await toDocxArchive(
      columnStacks({ columns: { endBeforePage: 'page-break-before' } }),
    );

    expect(emptyParagraphsOf(docx)).toHaveLength(0);
    const [nextParagraph] = paragraphs(docx.document).filter(
      (paragraph) => textOf(paragraph) === 'Next page',
    );
    expect(isFlagSet(nextParagraph, 'w:pageBreakBefore')).toBe(true);
    // The column section, then the next stack as a continuous section.
    expect(sectionTypes(docx)).toEqual([undefined, 'continuous']);
  });

  it('falls back to an empty line when the next stack starts with a table', async () => {
    const docx = await toDocxArchive(
      columnStacks(
        { columns: { endBeforePage: 'page-break-before' } },
        <Table>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </Table>,
      ),
    );

    expect(emptyParagraphsOf(docx)).toHaveLength(1);
    expect(findAll(docx.document, 'w:pageBreakBefore')).toHaveLength(0);
  });

  it('leaves columns unbalanced when `fill` is `sequential`', async () => {
    const docx = await toDocxArchive(
      columnStacks({ columns: { fill: 'sequential' } }),
    );

    expect(emptyParagraphsOf(docx)).toHaveLength(0);
    expect(sectionTypes(docx)).toEqual([undefined, undefined]);
  });
});

describe('fragmentation rules', () => {
  const oneParagraph = (fragmentation?: FragmentationOption) => (
    <DocumentProvider fragmentation={fragmentation}>
      <Stack>
        <p>Text</p>
      </Stack>
    </DocumentProvider>
  );

  it('turns widow control off when fewer than two lines are asked for', async () => {
    const docx = await toDocxArchive(
      oneParagraph({ lines: { orphans: 1, widows: 1 } }),
    );

    const [widowControl] = findAll(docx.styles, 'w:widowControl');
    expect(attribute(widowControl, 'w:val')).toBe('0');
  });

  it('makes Word add adjacent spacing together when margins `sum`', async () => {
    const summed = await toDocxArchive(
      oneParagraph({ margins: { adjacent: 'sum' } }),
    );
    const collapsed = await toDocxArchive(oneParagraph());

    expect(
      findAll(summed.settings, 'w:doNotUseHTMLParagraphAutoSpacing'),
    ).toHaveLength(1);
    expect(
      findAll(collapsed.settings, 'w:doNotUseHTMLParagraphAutoSpacing'),
    ).toHaveLength(0);
  });

  it('follows the table rules of the `css` profile', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider fragmentation="css">
        <Stack>
          <Table>
            <TableRow header>
              <TableCell>Head</TableCell>
            </TableRow>
            <TableRow keepTogether={false}>
              <TableCell>Body</TableCell>
            </TableRow>
          </Table>
        </Stack>
      </DocumentProvider>,
    );

    const [table] = tables(docx.document);
    // Tables break only between rows, and no header repeats.
    expect(findAll(table, 'w:tblHeader')).toHaveLength(0);
    expect(findAll(table, 'w:cantSplit')).toHaveLength(2);
  });
});

describe('Raw', () => {
  it('renders the tags inside a Raw element through the standard mapping', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Raw as="div">
            <h3>Raw heading</h3>
            <p>
              Raw paragraph with <b>bold</b> text.
            </p>
            <ul>
              <li>Raw list item</li>
            </ul>
          </Raw>
        </Stack>
      </DocumentProvider>,
    );

    expect(paragraphs(docx.document).map(textOf)).toEqual([
      'Raw heading',
      'Raw paragraph with bold text.',
      'Raw list item',
    ]);
    expect(paragraphStyleIds(docx.document)).toEqual([
      'Heading3',
      'ListParagraph',
    ]);
    // The intrinsic typography of a tag applies inside raw markup too.
    expect(findAll(docx.document, 'w:b')).toHaveLength(1);
    // A raw list starts at the first level, not below it.
    expect(
      findAll(docx.document, 'w:ilvl').map((level) =>
        attribute(level, 'w:val'),
      ),
    ).toEqual(['0']);
  });

  it('wraps text that has no paragraph of its own instead of dropping it', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Raw as="div">Bare raw text</Raw>
        </Stack>
      </DocumentProvider>,
    );

    expect(paragraphs(docx.document).map(textOf)).toEqual(['Bare raw text']);
    expect(bodyChildTagNames(docx.document)).toEqual(['w:p', 'w:sectPr']);
  });
});

describe('Svg', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns once and renders nothing when there is no rasterized image', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <p>Before</p>
          <Svg id="chart" width="30" height="20">
            <rect width="30" height="20" />
            <text x="0" y="10">
              Chart
            </text>
          </Svg>
        </Stack>
      </DocumentProvider>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('#chart');
    // Never a stray run at section level, and never the SVG labels as text.
    expect(bodyChildTagNames(docx.document)).toEqual(['w:p', 'w:sectPr']);
    expect(textOf(docx.document)).toBe('Before');
  });

  it('renders the rasterized image when one is given for the element', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Svg id="chart" width="30" height="20">
            <rect width="30" height="20" />
          </Svg>
        </Stack>
      </DocumentProvider>,
      {
        svgImages: {
          chart: { data: PNG_BASE64, width: 30, height: 20 },
        },
      },
    );

    expect(findAll(docx.document, 'w:drawing')).toHaveLength(1);
    expect(bodyChildTagNames(docx.document)).toEqual(['w:p', 'w:sectPr']);
    expect(
      docx.fileNames.filter((name) => /^word\/media\/.+\.png$/.test(name)),
    ).toHaveLength(1);
  });
});

describe('white-space: nowrap', () => {
  it('joins the phrase with non-breaking spaces in one run', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <p>
            <Typography whiteSpace="nowrap">Do not break me</Typography>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    const [paragraph] = paragraphs(docx.document);
    expect(textOf(paragraph)).toBe(
      `Do${NO_BREAK_SPACE}not${NO_BREAK_SPACE}break${NO_BREAK_SPACE}me`,
    );
    // One run per phrase, and no run nested in another run, which is not valid
    // OOXML.
    const runs = findAll(paragraph, 'w:r');
    expect(runs).toHaveLength(1);
    expect(findAll(runs[0], 'w:sym')).toHaveLength(0);
  });
});

/**
 * `w:numPr` is what makes a paragraph an item of a list: the level it sits at
 * and the numbering instance it counts in.
 */
const numberingOf = (
  paragraph: XmlNode,
): undefined | { readonly level: string; readonly numId: string } => {
  const [properties] = findAll(paragraph, 'w:numPr');
  if (!properties) {
    return undefined;
  }
  return {
    level: attribute(findAll(properties, 'w:ilvl')[0], 'w:val')!,
    numId: attribute(findAll(properties, 'w:numId')[0], 'w:val')!,
  };
};

type AbstractLevel = {
  readonly level: string;
  readonly format: undefined | string;
  readonly text: undefined | string;
  readonly start: undefined | string;
  readonly indentLeft: undefined | string;
  readonly indentHanging: undefined | string;
};

const levelsOf = (abstractNumbering: XmlNode): ReadonlyArray<AbstractLevel> =>
  findAll(abstractNumbering, 'w:lvl').map((level) => ({
    level: attribute(level, 'w:ilvl')!,
    format: attribute(findAll(level, 'w:numFmt')[0], 'w:val'),
    text: attribute(findAll(level, 'w:lvlText')[0], 'w:val'),
    start: attribute(findAll(level, 'w:start')[0], 'w:val'),
    indentLeft: attribute(findAll(level, 'w:ind')[0], 'w:left'),
    indentHanging: attribute(findAll(level, 'w:ind')[0], 'w:hanging'),
  }));

/**
 * The definition behind a `w:numId`, resolved the way Word resolves it:
 * `w:num` names the abstract numbering, which holds the levels, and the
 * instance may override where level 0 starts.
 *
 * Reading them this way rather than by position skips the bulleted definition
 * `docx` writes into every document whether or not anything uses it.
 */
const numberingDefinition = (
  { numbering }: DocxArchive,
  numId: string,
): {
  readonly abstractNumId: undefined | string;
  readonly levels: ReadonlyArray<AbstractLevel>;
  readonly startOverride: undefined | string;
} => {
  if (!numbering) {
    throw new TypeError('Expected the archive to contain word/numbering.xml.');
  }
  const concrete = findAll(numbering, 'w:num').find(
    (candidate) => attribute(candidate, 'w:numId') === numId,
  );
  if (!concrete) {
    throw new TypeError(`No w:num declares numId "${numId}".`);
  }
  const abstractNumId = attribute(
    findAll(concrete, 'w:abstractNumId')[0],
    'w:val',
  );
  const abstract = findAll(numbering, 'w:abstractNum').find(
    (candidate) => attribute(candidate, 'w:abstractNumId') === abstractNumId,
  );
  if (!abstract) {
    throw new TypeError(`No w:abstractNum declares id "${abstractNumId}".`);
  }
  return {
    abstractNumId,
    levels: levelsOf(abstract),
    startOverride: attribute(findAll(concrete, 'w:startOverride')[0], 'w:val'),
  };
};

/**
 * The level 0 marker format of every numbering the document's own paragraphs
 * reference, in the order they first use it.
 */
const usedFormats = (docx: DocxArchive): ReadonlyArray<undefined | string> => {
  const seen = new Set<undefined | string>();
  return paragraphs(docx.document).flatMap((paragraph) => {
    const itemNumbering = numberingOf(paragraph);
    if (!itemNumbering) {
      return [];
    }
    const { abstractNumId, levels } = numberingDefinition(
      docx,
      itemNumbering.numId,
    );
    if (seen.has(abstractNumId)) {
      return [];
    }
    seen.add(abstractNumId);
    return [levels[0].format];
  });
};

describe('List', () => {
  it('numbers a plain ol in decimals and bullets a plain ul', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <ol>
            <li>First</li>
            <li>Second</li>
          </ol>
          <ul>
            <li>Bulleted</li>
          </ul>
        </Stack>
      </DocumentProvider>,
    );

    // An `<ol>` used to reach Word as a bulleted paragraph, which is a
    // different list to every reader of the file.
    expect(usedFormats(docx)).toEqual(['decimal', 'bullet']);

    const [first, second, bulleted] = paragraphs(docx.document);
    expect([first, second].map((item) => numberingOf(item)!.numId)).toEqual([
      numberingOf(first)!.numId,
      numberingOf(first)!.numId,
    ]);
    expect(numberingOf(bulleted)!.numId).not.toBe(numberingOf(first)!.numId);
  });

  it('declares one abstract numbering per format, start and indent', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <List ordered>
            <ListItem>One</ListItem>
          </List>
          <List ordered>
            <ListItem>Also decimal from one</ListItem>
          </List>
          <List format="lowerRoman" start={3}>
            <ListItem>Third in roman</ListItem>
          </List>
          <List format="upperLetter">
            <ListItem>A</ListItem>
          </List>
        </Stack>
      </DocumentProvider>,
    );

    // The two decimal lists share a definition; only the markers differ.
    expect(usedFormats(docx)).toEqual(['decimal', 'lowerRoman', 'upperLetter']);
    const [first, second] = paragraphs(docx.document).map(
      (paragraph) => numberingOf(paragraph)!.numId,
    );
    expect(numberingDefinition(docx, first).abstractNumId).toBe(
      numberingDefinition(docx, second).abstractNumId,
    );
  });

  it('declares nine levels of the list format, each indented one step further', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <List ordered format="lowerRoman" start={3} indent="0.25in">
            <ListItem>Roman</ListItem>
          </List>
        </Stack>
      </DocumentProvider>,
    );

    const [item] = paragraphs(docx.document);
    const { levels } = numberingDefinition(docx, numberingOf(item)!.numId);
    expect(levels.map((level) => level.level)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
    expect(new Set(levels.map((level) => level.format))).toEqual(
      new Set(['lowerRoman']),
    );
    expect(new Set(levels.map((level) => level.start))).toEqual(new Set(['3']));
    // A level shows its own counter, so level 1 numbers with `%2`.
    expect(levels.slice(0, 2).map((level) => level.text)).toEqual([
      '%1.',
      '%2.',
    ]);
    // 0.25in is 360 twips, one step per level, and the marker hangs back by
    // Word's own quarter inch.
    expect(levels.slice(0, 3).map((level) => level.indentLeft)).toEqual([
      '360',
      '720',
      '1080',
    ]);
    expect(levels[0].indentHanging).toBe('360');
  });

  it('restarts an ordered list at its start rather than continuing the one before it', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <List ordered>
            <ListItem>One</ListItem>
          </List>
          <List ordered start={7}>
            <ListItem>Seven</ListItem>
          </List>
          <List ordered>
            <ListItem>One again</ListItem>
          </List>
        </Stack>
      </DocumentProvider>,
    );

    const [one, seven, oneAgain] = paragraphs(docx.document).map((paragraph) =>
      numberingOf(paragraph)!,
    );
    // Three lists, three instances: sharing one would make the third list
    // carry on from the first.
    expect(new Set([one.numId, seven.numId, oneAgain.numId]).size).toBe(3);
    expect(one.level).toBe('0');

    expect(numberingDefinition(docx, seven.numId).startOverride).toBe('7');
    expect(numberingDefinition(docx, one.numId).startOverride).toBe('1');
    expect(numberingDefinition(docx, seven.numId).levels[0].start).toBe('7');
  });

  it('keeps the level of a nested list', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <List ordered>
            <ListItem>Depth one</ListItem>
            <List format="lowerLetter">
              <ListItem>Depth two</ListItem>
              <List format="lowerRoman">
                <ListItem>Depth three</ListItem>
              </List>
            </List>
          </List>
        </Stack>
      </DocumentProvider>,
    );

    expect(
      paragraphs(docx.document).map((paragraph) => [
        textOf(paragraph),
        numberingOf(paragraph)!.level,
      ]),
    ).toEqual([
      ['Depth one', '0'],
      ['Depth two', '1'],
      ['Depth three', '2'],
    ]);
  });

  it('keeps the numbering of a list written as raw markup', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <Raw as="div">
            <ol start={4}>
              <li>Fourth</li>
            </ol>
          </Raw>
        </Stack>
      </DocumentProvider>,
    );

    expect(usedFormats(docx)).toEqual(['decimal']);
    const [item] = paragraphs(docx.document);
    expect(numberingOf(item)!.level).toBe('0');
    expect(
      numberingDefinition(docx, numberingOf(item)!.numId).levels[0].start,
    ).toBe('4');
  });
});

describe('Bookmark and Link', () => {
  it('anchors an internal link on the bookmark it points at', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <h2>
            <Bookmark id="cetology">Cetology</Bookmark>
          </h2>
          <p>
            <Link to="#cetology">Back to cetology</Link>
          </p>
          <p>
            <Link bookmark="cetology">Also back</Link>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    const [bookmarkStart] = findAll(docx.document, 'w:bookmarkStart');
    expect(attribute(bookmarkStart, 'w:name')).toBe('cetology');
    expect(findAll(docx.document, 'w:bookmarkEnd')).toHaveLength(1);

    const hyperlinks = findAll(docx.document, 'w:hyperlink');
    expect(hyperlinks.map((link) => attribute(link, 'w:anchor'))).toEqual([
      'cetology',
      'cetology',
    ]);
    // An internal link needs no relationship of its own.
    expect(hyperlinks.map((link) => attribute(link, 'r:id'))).toEqual([
      undefined,
      undefined,
    ]);
    expect(hyperlinks.map((link) => runStyleIds(link))).toEqual([
      ['Hyperlink'],
      ['Hyperlink'],
    ]);
  });

  it('leaves an external link on the relationship path', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <p>
            <Link href="https://example.com/">Example</Link>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    const [hyperlink] = findAll(docx.document, 'w:hyperlink');
    expect(attribute(hyperlink, 'r:id')).toBeDefined();
    expect(attribute(hyperlink, 'w:anchor')).toBeUndefined();
    expect(runStyleIds(hyperlink)).toEqual(['Hyperlink']);
  });

  it('escapes a bookmark id the same way on the mark and on the link', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <p>
            <Bookmark id="chapter one">Chapter one</Bookmark>
          </p>
          <p>
            <Link bookmark="chapter one">Go</Link>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    const name = attribute(
      findAll(docx.document, 'w:bookmarkStart')[0],
      'w:name',
    );
    // Bookmark names are single tokens, so a space cannot survive as itself.
    expect(name).toBe('chapterU0020one');
    expect(
      attribute(findAll(docx.document, 'w:hyperlink')[0], 'w:anchor'),
    ).toBe(name);
  });

  it('does not style a bookmark target as a hyperlink', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider variants={createMockVariantsConfig()}>
        <Stack>
          <p>
            <Bookmark id="target">Not a link</Bookmark>
          </p>
        </Stack>
      </DocumentProvider>,
    );

    expect(findAll(docx.document, 'w:hyperlink')).toHaveLength(0);
    expect(runStyleIds(docx.document)).toEqual([]);
    expect(textOf(docx.document)).toBe('Not a link');
  });
});

describe('TabSplit', () => {
  it('writes a right tab stop at the text width and a tab in the run', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider size={{ width: '8.5in', height: '11in' }}>
        <Stack margin={{ left: '1in', right: '1in' }}>
          <TabSplit left="Title" right="Date" />
        </Stack>
      </DocumentProvider>,
    );

    const [paragraph] = paragraphs(docx.document);
    // A `w:ptab` is the exact construct, but docx-preview and most other
    // readers drop it and run the two sides together.
    expect(findAll(paragraph, 'w:ptab')).toHaveLength(0);

    const [tabStops] = findAll(paragraph, 'w:tabs');
    const [tabStop] = childrenOf(tabStops);
    expect(attribute(tabStop, 'w:val')).toBe('right');
    // 8.5in less two 1in margins is 9360 twips.
    expect(attribute(tabStop, 'w:pos')).toBe('9360');

    // Exactly one run holds the tab that travels to it.
    const tabRuns = findAll(paragraph, 'w:r').filter(
      (run) => findAll(run, 'w:tab').length > 0,
    );
    expect(tabRuns).toHaveLength(1);
    expect(textOf(paragraph)).toBe('TitleDate');
  });

  it('narrows the tab stop to one column inside a multi column stack', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider size={{ width: '8.5in', height: '11in' }}>
        <Stack
          margin={{ left: '1in', right: '1in' }}
          columns={{ columnCount: 2, columnGap: '0.5in' }}
        >
          <TabSplit left="Title" right="Date" />
        </Stack>
      </DocumentProvider>,
    );

    const [tabStops] = findAll(paragraphs(docx.document)[0], 'w:tabs');
    // (9360 - 720) / 2.
    expect(attribute(childrenOf(tabStops)[0], 'w:pos')).toBe('4320');
  });

  it('keeps the tab stop on a heading TabSplit', async () => {
    const docx = await toDocxArchive(
      <DocumentProvider>
        <Stack>
          <TabSplit as="h3" left="Chapter 1" right="Loomings" />
          <p>Plain paragraph</p>
        </Stack>
      </DocumentProvider>,
    );

    const [heading, plain] = paragraphs(docx.document);
    expect(findAll(heading, 'w:tabs')).toHaveLength(1);
    expect(paragraphStyleIds(heading)).toEqual(['Heading3']);
    // Only the paragraph that holds a tab declares a stop for it.
    expect(findAll(plain, 'w:tabs')).toHaveLength(0);
  });
});
