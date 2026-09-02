import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  TABLE_BORDER_CSS_STYLES,
  type Color,
  type TableAlign,
  type TableBordersConfig,
  type TableVerticalAlign,
  type TypographyOptions,
  type UnitsSize,
  type VariantName,
} from '../entities';
import { InternalElement } from './InternalElement';
import type { ExtendableProps } from './entities';

/**
 * How wide a table or a cell is: a number is a percentage of the space around
 * it, a length is absolute.
 */
export type TableWidth = number | UnitsSize;

export type TableBorders = {
  color?: Color;
  size?: UnitsSize;
  /** `none` draws nothing, and is how a bordered table hides one rule set. */
  style?: TableBordersConfig['style'];
};

export type TableProps = ExtendableProps &
  TypographyOptions & {
    /**
     * One entry per column: absolute lengths, or unitless weights that share
     * the table width between the columns. Given, the columns are laid out
     * exactly as asked in both targets; left out, they size themselves to
     * their content in both.
     */
    columnWidths?: ReadonlyArray<UnitsSize> | ReadonlyArray<number>;
    width?: TableWidth;
    borders?: boolean | TableBorders;
    cellPadding?: UnitsSize;
    /** Where the table sits when it is narrower than the text. */
    align?: TableAlign;
    repeatHeader?: boolean;
    variant?: VariantName;
    children?: ReactNode;
  };

export const DEFAULT_TABLE_BORDERS = {
  color: '#000000',
  size: '1px',
  style: 'single',
} as const satisfies TableBordersConfig;

export const DEFAULT_TABLE_OPTIONS = {
  width: 100,
  cellPadding: '4px',
  repeatHeader: true,
} as const satisfies Partial<TableProps>;

/**
 * The CSS `margin` pair that puts a table narrower than the text on one side of
 * it. Word aligns a table through `w:jc` on the table itself, which is the same
 * idea written the other way round.
 */
const ALIGN_MARGINS = {
  left: { marginLeft: 0, marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 'auto', marginRight: 0 },
} as const satisfies Record<TableAlign, Record<string, string | number>>;

/**
 * CSS names the middle of a cell `middle`, OOXML names it `center`, and both
 * targets have to be told the same thing.
 */
const VERTICAL_ALIGN_CSS = {
  top: 'top',
  middle: 'middle',
  bottom: 'bottom',
} as const satisfies Record<TableVerticalAlign, string>;

const toBordersConfig = (
  borders: undefined | boolean | TableBorders,
): false | TableBordersConfig => {
  if (borders === false) {
    return false;
  }
  if (borders === undefined || borders === true) {
    return DEFAULT_TABLE_BORDERS;
  }
  return { ...DEFAULT_TABLE_BORDERS, ...borders };
};

const toCssWidth = (width: TableWidth): string =>
  typeof width === 'number' ? `${width}%` : width;

/**
 * The width of the columns `columnStart` to `columnStart + columnSpan`: lengths
 * are added up, weights become their share of the table as a percentage, which
 * is how the DOCX target divides the same weights into twips.
 */
const toColumnCssWidth = (
  columnWidths: ReadonlyArray<UnitsSize> | ReadonlyArray<number>,
  { columnStart, columnSpan }: { columnStart: number; columnSpan: number },
): undefined | string => {
  const spanned = columnWidths.slice(columnStart, columnStart + columnSpan);
  if (spanned.length === 0) {
    return undefined;
  }
  if (typeof spanned[0] === 'number') {
    const sum = (weights: ReadonlyArray<number>) =>
      weights.reduce((total, weight) => total + weight, 0);
    return `${
      (sum(spanned as ReadonlyArray<number>) * 100) /
      sum(columnWidths as ReadonlyArray<number>)
    }%`;
  }
  const lengths = spanned as ReadonlyArray<UnitsSize>;
  return lengths.length === 1 ? lengths[0] : `calc(${lengths.join(' + ')})`;
};

type TableContextValue = {
  columnWidths: TableProps['columnWidths'];
  borders: false | TableBordersConfig;
  cellPadding: UnitsSize;
};

const TableContext = createContext<undefined | TableContextValue>(undefined);

type TableRowContextValue = {
  header: boolean;
  keepTogether: boolean;
};

const TableRowContext = createContext<undefined | TableRowContextValue>(
  undefined,
);

/**
 * Where one cell sits in the table's grid.
 *
 * A `<col>` width is lost as soon as a table is paginated -- pagedjs rebuilds
 * the ancestors of the row it broke at and a `<colgroup>` is not one of them --
 * so the width is written onto every cell as well, which is what keeps the
 * continuation table on the next page the same shape as the first. Word is told
 * the same thing through the `w:tcW` of every cell.
 */
type TableCellContextValue = {
  columnStart: number;
  columnSpan: number;
};

const TableCellContext = createContext<undefined | TableCellContextValue>(
  undefined,
);

const columnSpanOf = (child: ReactNode): number =>
  isValidElement<TableCellProps>(child) && child.type === TableCell
    ? Math.max(child.props.colSpan ?? 1, 1)
    : 1;

const isHeaderRow = (child: ReactNode): boolean =>
  isValidElement<TableRowProps>(child) &&
  child.type === TableRow &&
  child.props.header === true;

/**
 * A data table: rows of cells that mean the same thing in a browser and in
 * Word, rather than the borderless layout tables `Grid` and `Split` build.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | A `<table>` with `border-collapse: collapse`, an optional `<colgroup>` of `<col>` widths (with `table-layout: fixed`), a `<thead>` of the header rows and a `<tbody>` of the rest. Borders and padding are written as inline styles on every `<th>`/`<td>`, because the library's own `*` rule resets `border-width` and would otherwise win over a user-agent default. |
 * | PDF | The same `<table>`, paginated by pagedjs. A row whose `keepTogether` is set moves to the next page whole. |
 * | DOCX | A `Table` whose `w:tblW` is a percentage or a whole number of twips, whose `w:tblGrid` holds the column widths in twips, whose `w:tblBorders` carries all six sides, and whose `w:tblCellMar` carries `cellPadding`. Header rows get `w:tblHeader`, so Word repeats them at the top of every page the table spans. |
 *
 * A header row is hoisted into `<thead>` when it is a direct {@link TableRow}
 * child of the table; one built by a component of its own still carries
 * `header` to Word but stays in `<tbody>` in the browser.
 *
 * Header repetition is DOCX only: pagedjs 0.4 rebuilds a split table's
 * ancestors without their children, so the continuation table on the next page
 * has no `<thead>`. The header therefore repeats in Word and not in the browser
 * or the PDF.
 *
 * @example
 * <Table columnWidths={[2, 1]} borders={{ color: '#999999' }} cellPadding="6px">
 *   <TableRow header fontWeight="bold">
 *     <TableCell>Chapter</TableCell>
 *     <TableCell align="right">Page</TableCell>
 *   </TableRow>
 *   <TableRow>
 *     <TableCell>Loomings</TableCell>
 *     <TableCell align="right">1</TableCell>
 *   </TableRow>
 * </Table>
 */
export function Table({
  columnWidths,
  width = DEFAULT_TABLE_OPTIONS.width,
  borders: bordersProp,
  cellPadding = DEFAULT_TABLE_OPTIONS.cellPadding,
  align,
  repeatHeader = DEFAULT_TABLE_OPTIONS.repeatHeader,
  variant,
  className,
  style,
  children,
  ...contentOptions
}: TableProps) {
  const borders = useMemo(() => toBordersConfig(bordersProp), [bordersProp]);

  const rows = Children.toArray(children);
  const headerRows = rows.filter((child) => isHeaderRow(child));
  const bodyRows = rows.filter((child) => !isHeaderRow(child));

  return (
    <TableContext.Provider
      value={useMemo(
        () => ({ columnWidths, borders, cellPadding }),
        [columnWidths, borders, cellPadding],
      )}
    >
      <InternalElement
        tagName="table"
        elementType="table"
        elementOptions={{
          columnWidths,
          width,
          borders,
          cellPadding,
          align,
          repeatHeader,
        }}
        variant={variant}
        className={className}
        style={{
          borderCollapse: 'collapse',
          width: toCssWidth(width),
          // Column widths are only honoured exactly under the fixed algorithm,
          // which is also the one Word applies to a table that declares a grid.
          ...(columnWidths && { tableLayout: 'fixed' }),
          ...(align && ALIGN_MARGINS[align]),
          ...style,
        }}
        typography={contentOptions}
      >
        {columnWidths && (
          <colgroup>
            {columnWidths.map((_columnWidth, index) => (
              <col
                key={index}
                style={{
                  width: toColumnCssWidth(columnWidths, {
                    columnStart: index,
                    columnSpan: 1,
                  }),
                }}
              />
            ))}
          </colgroup>
        )}
        {headerRows.length > 0 && <thead>{headerRows}</thead>}
        <tbody>{bodyRows}</tbody>
      </InternalElement>
    </TableContext.Provider>
  );
}

export type TableRowProps = ExtendableProps &
  TypographyOptions & {
    /** Renders `<th>` cells, and repeats the row in Word. */
    header?: boolean;
    keepTogether?: boolean;
    height?: UnitsSize;
    variant?: VariantName;
    children?: ReactNode;
  };

/**
 * One row of a {@link Table}.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | A `<tr>`. `height` becomes a CSS `height`, which a table row treats as a minimum. |
 * | PDF | The same `<tr>`. `keepTogether` puts `break-inside: avoid` on the row and on its cells, which is what pagedjs reads to move a whole row to the next page instead of splitting it. |
 * | DOCX | A `TableRow` with `w:cantSplit` for `keepTogether`, `w:tblHeader` for `header` (unless the table turned `repeatHeader` off) and a `w:trHeight` of `atLeast` twips for `height`. |
 *
 * `keepTogether` defaults to true: a row split down the middle reads as two
 * broken rows in every target, and Word and pagedjs both need to be told not
 * to do it.
 */
export function TableRow({
  header = false,
  keepTogether = true,
  height,
  variant,
  className,
  style,
  children,
  ...contentOptions
}: TableRowProps) {
  const tableContext = useContext(TableContext);
  if (!tableContext) {
    throw new Error('TableRow must be a child of Table.');
  }
  return (
    <TableRowContext.Provider
      value={useMemo(() => ({ header, keepTogether }), [header, keepTogether])}
    >
      <InternalElement
        tagName="tr"
        elementType="tableRow"
        elementOptions={{ header, keepTogether, height }}
        variant={variant}
        className={className}
        style={{
          ...(keepTogether && { breakInside: 'avoid' }),
          ...(height && { height }),
          ...style,
        }}
        typography={contentOptions}
      >
        {positionCells(children)}
      </InternalElement>
    </TableRowContext.Provider>
  );
}

/**
 * Tells every cell which columns it covers, by walking the row and adding up
 * the spans before it. Anything that is not a {@link TableCell} written
 * directly into the row counts as one column, the same assumption an HTML
 * parser makes when it lays a row out.
 */
const positionCells = (children: ReactNode): ReactNode => {
  let columnStart = 0;
  return Children.map(children, (child) => {
    const columnSpan = columnSpanOf(child);
    const value = { columnStart, columnSpan };
    columnStart += columnSpan;
    return (
      <TableCellContext.Provider value={value}>
        {child}
      </TableCellContext.Provider>
    );
  });
};

export type TableCellProps = ExtendableProps &
  TypographyOptions & {
    colSpan?: number;
    rowSpan?: number;
    align?: TableAlign;
    verticalAlign?: TableVerticalAlign;
    background?: Color;
    width?: TableWidth;
    variant?: VariantName;
    children?: ReactNode;
  };

/**
 * One cell of a {@link TableRow}. Bare text in a cell is content, so it does
 * not need a paragraph of its own; a `Typography`, a `List` or any other block
 * may be nested inside instead.
 *
 * | Target | Rendering |
 * | --- | --- |
 * | HTML / DOM | A `<td>`, or a `<th scope="col">` inside a header row, carrying the table's border and padding, `colspan`/`rowspan`, `text-align`, `vertical-align`, `background-color` and `width`. |
 * | PDF | The same cell. |
 * | DOCX | A `TableCell` with `w:gridSpan` for `colSpan`, `w:vMerge` for `rowSpan` (`docx` writes the continuation cells of the rows below), `w:vAlign` for `verticalAlign`, a `w:shd` fill for `background` and a `w:tcW` for `width`. `align` reaches Word as the alignment of every paragraph in the cell, which is where Word keeps it. Content that is not already a block is gathered into a paragraph, because a `w:tc` with no block child makes the document unreadable. |
 */
export function TableCell({
  colSpan,
  rowSpan,
  align,
  verticalAlign,
  background,
  width,
  variant,
  className,
  style,
  children,
  ...contentOptions
}: TableCellProps) {
  const tableContext = useContext(TableContext);
  const rowContext = useContext(TableRowContext);
  const cellContext = useContext(TableCellContext);
  if (!tableContext || !rowContext) {
    throw new Error('TableCell must be a child of TableRow.');
  }
  const { columnWidths, borders, cellPadding } = tableContext;
  const { header, keepTogether } = rowContext;
  const columnCssWidth =
    columnWidths && cellContext
      ? toColumnCssWidth(columnWidths, cellContext)
      : undefined;
  return (
    <InternalElement
      tagName={header ? 'th' : 'td'}
      elementType="tableCell"
      elementOptions={{
        header,
        colSpan,
        rowSpan,
        align,
        verticalAlign,
        background,
        width,
      }}
      variant={variant}
      className={className}
      htmlAttributes={{
        ...(header && { scope: 'col' }),
        ...(colSpan !== undefined && { colSpan }),
        ...(rowSpan !== undefined && { rowSpan }),
      }}
      style={{
        padding: cellPadding,
        ...(borders !== false && {
          borderWidth: borders.size,
          borderStyle: TABLE_BORDER_CSS_STYLES[borders.style],
          borderColor: borders.color,
        }),
        // pagedjs moves the whole row when a cell it is breaking inside says
        // not to, so the rule has to be on the cell as well as on the row.
        ...(keepTogether && { breakInside: 'avoid' }),
        ...(verticalAlign && {
          verticalAlign: VERTICAL_ALIGN_CSS[verticalAlign],
        }),
        ...(background && { backgroundColor: background }),
        // A cell's own width wins over the share of the grid it would take.
        ...(width === undefined
          ? columnCssWidth !== undefined && { width: columnCssWidth }
          : { width: toCssWidth(width) }),
        ...style,
      }}
      typography={{ ...(align && { textAlign: align }), ...contentOptions }}
    >
      {children}
    </InternalElement>
  );
}
