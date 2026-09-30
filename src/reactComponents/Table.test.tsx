import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';
import type { DocumentType } from '../entities';
import { reactToHtml } from '../lib/reactToHtml';
import { ContentProvider } from './ContentProvider';
import {
  Table,
  TableCell,
  TableRow,
  type TableCellProps,
  type TableProps,
  type TableRowProps,
} from './Table';

const render = (children: ReactNode, documentType: DocumentType = 'web') =>
  reactToHtml(() => <ContentProvider>{children}</ContentProvider>, documentType);

const renderTable = (
  props: Omit<TableProps, 'children'> = {},
  rowProps: Omit<TableRowProps, 'children'> = {},
  cellProps: Omit<TableCellProps, 'children'> = {},
) =>
  render(
    <Table {...props}>
      <TableRow header>
        <TableCell>Chapter</TableCell>
        <TableCell>Page</TableCell>
      </TableRow>
      <TableRow {...rowProps}>
        <TableCell {...cellProps}>Loomings</TableCell>
        <TableCell>1</TableCell>
      </TableRow>
    </Table>,
  );

describe('Table', () => {
  test('renders a collapsed table that fills the text width', () => {
    const html = renderTable();
    expect(html.startsWith('<table ')).toBe(true);
    expect(html).toContain('border-collapse:collapse');
    expect(html).toContain('width:100%');
  });

  test('puts header rows in a thead and the rest in a tbody', () => {
    const html = renderTable();
    expect(html).toContain('<thead><tr');
    expect(html).toContain('<tbody><tr');
    // The header row is hoisted above the body whatever order it was written
    // in, because HTML only accepts a thead before a tbody.
    expect(html.indexOf('<thead')).toBeLessThan(html.indexOf('<tbody'));
    expect(html.indexOf('Chapter')).toBeLessThan(html.indexOf('Loomings'));
  });

  test('leaves out the thead when no row is a header', () => {
    const html = render(
      <Table>
        <TableRow>
          <TableCell>Only</TableCell>
        </TableRow>
      </Table>,
    );
    expect(html).not.toContain('<thead');
    expect(html).toContain('<tbody');
  });

  test('takes a width as a percentage or as a length', () => {
    expect(renderTable({ width: 60 })).toContain('width:60%');
    expect(renderTable({ width: '4in' })).toContain('width:4in');
  });

  test('aligns a narrow table with auto margins', () => {
    const html = renderTable({ width: 50, align: 'center' });
    expect(html).toContain('margin-left:auto');
    expect(html).toContain('margin-right:auto');
    expect(renderTable({ align: 'right' })).toContain('margin-left:auto');
    expect(renderTable({ align: 'right' })).toContain('margin-right:0');
  });

  test('declares absolute column widths in a colgroup', () => {
    const html = renderTable({ columnWidths: ['2in', '1in'] });
    expect(html).toContain('table-layout:fixed');
    expect(html).toContain('<colgroup><col style="width:2in"/>');
    expect(html).toContain('<col style="width:1in"/></colgroup>');
  });

  test('shares the table between relative column widths', () => {
    const html = renderTable({ columnWidths: [3, 1] });
    expect(html).toContain('<col style="width:75%"/>');
    expect(html).toContain('<col style="width:25%"/>');
  });

  test('leaves the layout to the content when no widths are given', () => {
    const html = renderTable();
    expect(html).not.toContain('colgroup');
    expect(html).not.toContain('table-layout');
    expect(html).not.toContain('width:50%');
  });

  test('repeats the column width on every cell, which survives a page break', () => {
    // The cells carry the widths as well as the `<colgroup>`, so a cell keeps
    // its shape wherever it is laid out.
    const html = render(
      <Table columnWidths={[3, 1, 1]}>
        <TableRow>
          <TableCell colSpan={2}>Wide</TableCell>
          <TableCell>Last</TableCell>
        </TableRow>
      </Table>,
    );
    expect(html).toContain('width:80%');
    expect(html).toContain('width:20%');
  });

  test('adds up the absolute widths a cell spans', () => {
    const html = render(
      <Table columnWidths={['2in', '1in']}>
        <TableRow>
          <TableCell colSpan={2}>Span</TableCell>
        </TableRow>
      </Table>,
    );
    expect(html).toContain('width:calc(2in + 1in)');
  });

  test('carries its options to the parsers outside the web target', () => {
    expect(renderTable()).not.toContain('data-matti-docs-element-type');

    const encoded = render(
      <Table width={50} repeatHeader={false}>
        <TableRow>
          <TableCell>Cell</TableCell>
        </TableRow>
      </Table>,
      'docx',
    );
    expect(encoded).toContain('data-matti-docs-element-type="table"');
    expect(encoded).toContain('data-matti-docs-element-type="tableRow"');
    expect(encoded).toContain('data-matti-docs-element-type="tableCell"');
    expect(encoded).toContain(
      `data-matti-docs-element-options="${encodeURI(
        JSON.stringify({
          width: 50,
          borders: { color: '#000000', size: '1px', style: 'single' },
          cellPadding: '4px',
          repeatHeader: false,
        }),
      )}"`,
    );
  });
});

describe('Table borders and padding', () => {
  test('draws a single black hairline around every cell by default', () => {
    const html = renderTable();
    expect(html).toContain('border-width:1px');
    expect(html).toContain('border-style:solid');
    expect(html).toContain('border-color:#000000');
    // The library resets `border-width` on every element, so the rule has to
    // be an inline style rather than a user-agent default.
    expect(html.split('border-style:solid').length - 1).toBe(4);
  });

  test('takes a colour, a size and a style', () => {
    const html = renderTable({
      borders: { color: '#ff0000', size: '2pt', style: 'dashed' },
    });
    expect(html).toContain('border-width:2pt');
    expect(html).toContain('border-style:dashed');
    expect(html).toContain('border-color:#ff0000');
  });

  test('draws nothing when borders are off', () => {
    const html = renderTable({ borders: false });
    expect(html).not.toContain('border-style');
    expect(html).not.toContain('border-width');
  });

  test('pads every cell', () => {
    expect(renderTable()).toContain('padding:4px');
    expect(renderTable({ cellPadding: '0.1in' })).toContain('padding:0.1in');
  });
});

describe('TableRow', () => {
  test('renders th cells in a header row and td cells elsewhere', () => {
    const html = renderTable();
    expect(html).toContain('<th ');
    expect(html).toContain('scope="col"');
    expect(html).toContain('<td ');
    expect(html.indexOf('<th')).toBeLessThan(html.indexOf('<td'));
  });

  test('keeps a row together in the browser by default', () => {
    const html = renderTable();
    // The Fragmenter reads the rule on the row; a browser's own
    // fragmentation reads it on the cell it breaks inside.
    expect(html.split('break-inside:avoid').length - 1).toBe(6);
  });

  test('lets a row split when it is told to', () => {
    const html = renderTable({}, { keepTogether: false });
    expect(html.split('break-inside:avoid').length - 1).toBe(3);
  });

  test('writes a height as a minimum row height', () => {
    expect(renderTable({}, { height: '0.5in' })).toContain('height:0.5in');
  });

  test('applies its typography to the whole row', () => {
    expect(renderTable({}, { fontWeight: 'bold' })).toContain(
      'font-weight:bold',
    );
  });

  test('refuses to render outside a table', () => {
    expect(() =>
      render(
        <TableRow>
          <TableCell>Orphan</TableCell>
        </TableRow>,
      ),
    ).toThrow('TableRow must be a child of Table.');
  });
});

describe('TableCell', () => {
  test('writes spans as the attributes the browser reads', () => {
    const html = renderTable({}, {}, { colSpan: 2, rowSpan: 3 });
    // React writes `rowSpan` lowercased and `colSpan` as it was given; HTML
    // attribute names are case insensitive, so both parse as the span.
    expect(html).toMatch(/colspan="2"/i);
    expect(html).toMatch(/rowspan="3"/i);
    expect(renderTable()).not.toMatch(/colspan/i);
  });

  test('aligns its content horizontally and vertically', () => {
    const html = renderTable(
      {},
      {},
      { align: 'right', verticalAlign: 'middle' },
    );
    expect(html).toContain('text-align:right');
    expect(html).toContain('vertical-align:middle');
  });

  test('fills its background and takes a width of its own', () => {
    const html = renderTable({}, {}, { background: '#eeeeee', width: 25 });
    expect(html).toContain('background-color:#eeeeee');
    expect(html).toContain('width:25%');
    expect(renderTable({}, {}, { width: '1.5in' })).toContain('width:1.5in');
  });

  test('lets its own width win over its share of the columns', () => {
    const html = renderTable({ columnWidths: ['2in', '1in'] }, {}, {
      width: '0.5in',
    });
    expect(html).toContain('width:0.5in');
    // The other cells still take their column's width.
    expect(html).toContain('width:1in');
  });

  test('holds blocks as well as bare text', () => {
    const html = render(
      <Table>
        <TableRow>
          <TableCell>
            <p>A paragraph</p>
          </TableCell>
          <TableCell>Bare text</TableCell>
        </TableRow>
      </Table>,
    );
    expect(html).toContain('<p>A paragraph</p>');
    expect(html).toContain('Bare text');
  });

  test('refuses to render outside a row', () => {
    expect(() => render(<TableCell>Orphan</TableCell>)).toThrow(
      'TableCell must be a child of TableRow.',
    );
  });
});
