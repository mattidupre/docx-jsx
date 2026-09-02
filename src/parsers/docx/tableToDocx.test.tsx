import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import {
  BreakAvoid,
  DocumentProvider,
  List,
  ListItem,
  Raw,
  Stack,
  Table,
  TableCell,
  TableRow,
  Typography,
} from '../../reactComponents';
import { mockFonts } from '../../fixtures/mockFonts';
import { reactToDocx } from '../../reactToDocx';
import {
  attribute,
  findAll,
  inspectDocx,
  paragraphs,
  tables,
  textOf,
  type DocxArchive,
  type XmlNode,
  type XmlNodes,
} from '../../fixtures/docxInspect';

const toDocxArchive = async (element: ReactElement): Promise<DocxArchive> =>
  inspectDocx(await reactToDocx(() => element, { fonts: mockFonts }));

const rows = (table: XmlNode): XmlNodes => findAll(table, 'w:tr');

const cells = (row: XmlNode): XmlNodes => findAll(row, 'w:tc');

const values = (
  root: XmlNode | XmlNodes,
  tagName: string,
): ReadonlyArray<undefined | string> =>
  findAll(root, tagName).map((node) => attribute(node, 'w:val'));

const widths = (
  root: XmlNode | XmlNodes,
  tagName: string,
): ReadonlyArray<undefined | string> =>
  findAll(root, tagName).map((node) => attribute(node, 'w:w'));

/**
 * `docx` writes an off switch as `w:val="false"` rather than leaving the
 * element out, so presence alone does not mean the flag is set.
 */
const isFlagSet = (root: XmlNode | XmlNodes, tagName: string): boolean =>
  findAll(root, tagName).some((flag) => attribute(flag, 'w:val') !== 'false');

/**
 * The default page is 8.5in wide with 0.5in margins, so one line of text is
 * 10800 twips.
 */
const CONTENT_WIDTH_TWIP = 10800;

const CatalogueTable = ({
  children,
}: {
  children?: ReactElement | ReadonlyArray<ReactElement>;
}) => (
  <DocumentProvider>
    <Stack>{children}</Stack>
  </DocumentProvider>
);

describe('Table', () => {
  it('writes the table width, the grid and the cell widths as whole twips', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table width="6in" columnWidths={['4in', '2in']} cellPadding="0.05in">
          <TableRow>
            <TableCell>Wide</TableCell>
            <TableCell>Narrow</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    // 6in, 4in and 2in in twips, and 0.05in of padding on each of four sides.
    expect(widths(findAll(table, 'w:tblW'), 'w:tblW')).toEqual(['8640']);
    expect(widths(table, 'w:gridCol')).toEqual(['5760', '2880']);
    expect(widths(table, 'w:tcW')).toEqual(['5760', '2880']);
    expect(widths(findAll(table, 'w:tblCellMar'), 'w:top')).toEqual(['72']);
    expect(
      findAll(findAll(table, 'w:tblCellMar')[0], 'w:left').map((node) =>
        attribute(node, 'w:type'),
      ),
    ).toEqual(['dxa']);
    // Declared widths only bind under the fixed algorithm, in Word as in CSS.
    expect(values(table, 'w:tblLayout')).toEqual([undefined]);
    expect(
      findAll(table, 'w:tblLayout').map((node) => attribute(node, 'w:type')),
    ).toEqual(['fixed']);
  });

  it('writes a percentage width and shares it between relative columns', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table width={50} columnWidths={[3, 1]}>
          <TableRow>
            <TableCell>Three</TableCell>
            <TableCell>One</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    expect(widths(findAll(table, 'w:tblW'), 'w:tblW')).toEqual(['50%']);
    expect(
      findAll(table, 'w:tblW').map((node) => attribute(node, 'w:type')),
    ).toEqual(['pct']);
    // Half the 10800 twip text width, split three to one.
    expect(widths(table, 'w:gridCol')).toEqual(['4050', '1350']);
  });

  it('divides the table equally when no column widths are given', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow>
            <TableCell>One</TableCell>
            <TableCell>Two</TableCell>
            <TableCell>Three</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    const columnWidth = String(Math.round(CONTENT_WIDTH_TWIP / 3));
    expect(widths(table, 'w:gridCol')).toEqual([
      columnWidth,
      columnWidth,
      columnWidth,
    ]);
    // Without declared widths the columns fit their content, in Word as in CSS.
    expect(
      findAll(table, 'w:tblLayout').map((node) => attribute(node, 'w:type')),
    ).toEqual(['autofit']);
  });

  it('draws all six borders with the colour, size and style it was given', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table borders={{ color: '#ff0000', size: '1.5pt', style: 'dashed' }}>
          <TableRow>
            <TableCell>Bordered</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [borders] = findAll(tables(docx.document)[0], 'w:tblBorders');
    const sides = findAll(borders, 'w:top')
      .concat(findAll(borders, 'w:right'))
      .concat(findAll(borders, 'w:bottom'))
      .concat(findAll(borders, 'w:left'))
      .concat(findAll(borders, 'w:insideH'))
      .concat(findAll(borders, 'w:insideV'));
    expect(sides).toHaveLength(6);
    for (const side of sides) {
      expect(attribute(side, 'w:val')).toBe('dashed');
      // `w:sz` is eighths of a point.
      expect(attribute(side, 'w:sz')).toBe('12');
      expect(attribute(side, 'w:color')).toBe('ff0000');
    }
  });

  it('switches every border off rather than leaving them undeclared', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table borders={false}>
          <TableRow>
            <TableCell>Plain</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [borders] = findAll(tables(docx.document)[0], 'w:tblBorders');
    expect(values(borders, 'w:top')).toEqual(['none']);
    expect(values(borders, 'w:insideH')).toEqual(['none']);
    expect(values(borders, 'w:insideV')).toEqual(['none']);
  });

  it('aligns a table on the page', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table width={50} align="center">
          <TableRow>
            <TableCell>Centred</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [tableProperties] = findAll(tables(docx.document)[0], 'w:tblPr');
    expect(values(tableProperties, 'w:jc')).toEqual(['center']);
  });

  it('emits nothing for a table with no rows', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>{[]}</Table>
      </CatalogueTable>,
    );

    // A `w:tbl` without a `w:tr` makes the document unreadable.
    expect(tables(docx.document)).toHaveLength(0);
  });

  it('drops a row that holds no cells, which no target draws', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow />
          <TableRow>
            <TableCell>Only</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    // A `w:tr` without a `w:tc` makes the document unreadable.
    expect(rows(table)).toHaveLength(1);
    expect(textOf(table)).toBe('Only');
  });
});

describe('TableRow', () => {
  it('repeats a header row and keeps every row together', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow header>
            <TableCell>Chapter</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Loomings</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    const [headerRow, bodyRow] = rows(table);
    expect(isFlagSet(headerRow, 'w:tblHeader')).toBe(true);
    expect(findAll(bodyRow, 'w:tblHeader')).toHaveLength(0);
    // `keepTogether` is on by default: a row split down the middle reads as
    // two broken rows.
    expect(findAll(table, 'w:cantSplit')).toHaveLength(2);
    expect(textOf(headerRow)).toBe('Chapter');
  });

  it('does not repeat the header when the table turned repetition off', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table repeatHeader={false}>
          <TableRow header>
            <TableCell>Chapter</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    expect(findAll(tables(docx.document)[0], 'w:tblHeader')).toHaveLength(0);
  });

  it('lets a row split when it is told to', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow keepTogether={false}>
            <TableCell>Splittable</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    expect(findAll(tables(docx.document)[0], 'w:cantSplit')).toHaveLength(0);
  });

  it('writes a height as a minimum, which is what CSS gives a row', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow height="0.5in">
            <TableCell>Tall</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [height] = findAll(tables(docx.document)[0], 'w:trHeight');
    expect(attribute(height, 'w:val')).toBe('720');
    expect(attribute(height, 'w:hRule')).toBe('atLeast');
  });

  it('applies the typography of a row to the paragraphs of its cells', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow header fontWeight="bold">
            <TableCell>Chapter</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    expect(findAll(table, 'w:b')).not.toHaveLength(0);
  });
});

describe('TableCell', () => {
  it('spans columns and rows', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table columnWidths={['2in', '1in', '1in']}>
          <TableRow>
            <TableCell rowSpan={2}>Tall</TableCell>
            <TableCell colSpan={2}>Wide</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Left</TableCell>
            <TableCell>Right</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    const [firstRow, secondRow] = rows(table);
    expect(values(firstRow, 'w:gridSpan')).toEqual(['2']);
    // A spanning cell is as wide as the columns it covers: 1in and 1in.
    expect(widths(firstRow, 'w:tcW')).toEqual(['2880', '2880']);
    expect(values(firstRow, 'w:vMerge')).toEqual(['restart']);
    // `docx` writes the continuation cell of the row below from `rowSpan`.
    expect(values(secondRow, 'w:vMerge')).toEqual(['continue']);
    expect(cells(secondRow)).toHaveLength(3);
    expect(textOf(secondRow)).toBe('LeftRight');
  });

  it('fills a background and aligns its content in both directions', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow>
            <TableCell
              background="#eeeeee"
              align="right"
              verticalAlign="middle"
            >
              Zebra
            </TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [cell] = cells(rows(tables(docx.document)[0])[0]);
    const [shading] = findAll(cell, 'w:shd');
    expect(attribute(shading, 'w:fill')).toBe('eeeeee');
    expect(attribute(shading, 'w:val')).toBe('clear');
    // OOXML calls the middle of a cell `center`.
    expect(values(cell, 'w:vAlign')).toEqual(['center']);
    // Word keeps horizontal alignment on the paragraphs inside the cell.
    expect(values(cell, 'w:jc')).toEqual(['right']);
  });

  it('takes a width of its own over its share of the grid', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table columnWidths={['2in', '2in']}>
          <TableRow>
            <TableCell width="1in">Narrowed</TableCell>
            <TableCell width={25}>Quarter</TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [row] = rows(tables(docx.document)[0]);
    expect(widths(row, 'w:tcW')).toEqual(['1440', '25%']);
  });

  it('wraps bare text in a paragraph and keeps blocks as they are', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow>
            <TableCell>Bare text</TableCell>
            <TableCell>
              <p>A paragraph</p>
              <p>And another</p>
            </TableCell>
            <TableCell />
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [bare, blocks, empty] = cells(rows(tables(docx.document)[0])[0]);
    expect(paragraphs(bare).map(textOf)).toEqual(['Bare text']);
    expect(paragraphs(blocks).map(textOf)).toEqual([
      'A paragraph',
      'And another',
    ]);
    // A `w:tc` with no block child makes the document unreadable.
    expect(paragraphs(empty)).toHaveLength(1);
  });

  it('holds a nested list and inline typography', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Table>
          <TableRow>
            <TableCell>
              <List ordered>
                <ListItem>First</ListItem>
                <ListItem>Second</ListItem>
              </List>
            </TableCell>
            <TableCell>
              <Typography fontStyle="italic">Italic</Typography>
            </TableCell>
          </TableRow>
        </Table>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    const [listCell, typographyCell] = cells(rows(table)[0]);
    expect(paragraphs(listCell).map(textOf)).toEqual(['First', 'Second']);
    expect(findAll(listCell, 'w:numPr')).toHaveLength(2);
    expect(textOf(typographyCell)).toBe('Italic');
    expect(findAll(typographyCell, 'w:i')).not.toHaveLength(0);
  });

  it('keeps every cell paragraph together inside a BreakAvoid', async () => {
    const docx = await toDocxArchive(
      <CatalogueTable>
        <BreakAvoid>
          <Table>
            <TableRow>
              <TableCell>
                <p>First</p>
                <p>Second</p>
              </TableCell>
            </TableRow>
          </Table>
        </BreakAvoid>
      </CatalogueTable>,
    );

    const [table] = tables(docx.document);
    expect(findAll(table, 'w:keepLines')).toHaveLength(
      paragraphs(table).length,
    );
  });
});

describe('table validation', () => {
  it('refuses a table tag that no Table component built', async () => {
    await expect(
      toDocxArchive(
        <CatalogueTable>
          <table>
            <tbody>
              <tr>
                <td>Hand written</td>
              </tr>
            </tbody>
          </table>
        </CatalogueTable>,
      ),
    ).rejects.toThrow(/must be rendered by the Table, TableRow and TableCell/);
  });

  it('lets a Raw element keep the text of a table it was handed', async () => {
    // `Raw` is not validated by design. Word gets no table out of markup it was
    // not told to build, but the text still reaches the document as paragraphs
    // rather than disappearing in one target only.
    const docx = await toDocxArchive(
      <CatalogueTable>
        <Raw as="div">
          <table>
            <tbody>
              <tr>
                <td>Raw cell</td>
              </tr>
            </tbody>
          </table>
        </Raw>
      </CatalogueTable>,
    );

    expect(tables(docx.document)).toHaveLength(0);
    expect(textOf(docx.document)).toContain('Raw cell');
  });

  it('refuses a table inside a paragraph', async () => {
    // An HTML parser closes a `<p>` at a `<table>`, so the case that reaches
    // the mapper is a paragraph tag that holds other content: a list item,
    // which Word writes as a paragraph and which cannot hold a table.
    await expect(
      toDocxArchive(
        <CatalogueTable>
          <List>
            <ListItem>
              <Table>
                <TableRow>
                  <TableCell>Nested</TableCell>
                </TableRow>
              </Table>
            </ListItem>
          </List>
        </CatalogueTable>,
      ),
    ).rejects.toThrow('Tables cannot be nested inside paragraphs.');
  });
});
