import {
  AlignmentType,
  BorderStyle,
  HeightRule,
  type IParagraphPropertiesOptions,
  type ITableBordersOptions,
  type ITableWidthProperties,
  type Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  VerticalAlignTable,
  WidthType,
} from 'docx';
import type {
  FragmentationRules,
  ConfigByElementType,
  ElementData,
  ElementType,
  FontsConfig,
  TableAlign,
  TableBorderStyle,
  TableBordersConfig,
  TableVerticalAlign,
  UnitsSize,
} from '../../entities';
import { isElementOfType } from '../../entities';
import type { HtmlElementNode } from '../../lib/mapHtmlToDocument';
import { toBorderWidthEighths, toWholeTwip } from './entities';
import { toDocxColor } from './toDocxColor';
import { parseParagraphOptions } from './typographyOptionsToDocx';

/**
 * A width written as a number is a percentage; CSS writes `50%` and docx
 * writes it against `w:type="pct"` in fiftieths of a percent (`2500`).
 */
const PERCENT = 100;

const DOCX_TABLE_ALIGNMENT = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
} as const satisfies Record<TableAlign, string>;

/**
 * CSS calls the middle of a cell `middle` and OOXML calls it `center`.
 */
const DOCX_VERTICAL_ALIGN = {
  top: VerticalAlignTable.TOP,
  middle: VerticalAlignTable.CENTER,
  bottom: VerticalAlignTable.BOTTOM,
} as const satisfies Record<TableVerticalAlign, string>;

const DOCX_BORDER_STYLE = {
  single: BorderStyle.SINGLE,
  dashed: BorderStyle.DASHED,
  none: BorderStyle.NONE,
} as const satisfies Record<TableBorderStyle, string>;

/**
 * Word writes one border set for the whole table, so the six sides are always
 * written together: leaving `insideHorizontal` and `insideVertical` out would
 * draw a box around the table and nothing between its cells, which is not what
 * `border-collapse` does in the browser.
 */
const toTableBorders = (
  borders: false | TableBordersConfig,
): ITableBordersOptions => {
  const side =
    borders === false
      ? { style: BorderStyle.NONE }
      : {
          style: DOCX_BORDER_STYLE[borders.style],
          size: toBorderWidthEighths(borders.size),
          color: toDocxColor(borders.color),
        };
  return {
    top: side,
    right: side,
    bottom: side,
    left: side,
    insideHorizontal: side,
    insideVertical: side,
  };
};

const toWidthOption = (width: number | UnitsSize): ITableWidthProperties =>
  typeof width === 'number'
    ? { size: width, type: WidthType.PERCENTAGE }
    : { size: toWholeTwip(width), type: WidthType.DXA };

type ElementNodeOf<TElementType extends ElementType> = Omit<
  HtmlElementNode,
  'data'
> & {
  data: Omit<HtmlElementNode['data'], 'element'> & {
    element: ElementData<TElementType>;
  };
};

/**
 * The children of a node that are elements of `elementType`.
 *
 * A row reaches the table through whichever of `<thead>` and `<tbody>` holds
 * it -- both return their own children -- so the rows arrive flattened among
 * the empty results of `<colgroup>`, and a cell arrives among whatever runs a
 * malformed row contributed.
 */
const selectElementNodes = <TElementType extends ElementType>(
  children: ReadonlyArray<unknown>,
  elementType: TElementType,
): ReadonlyArray<ElementNodeOf<TElementType>> =>
  children.filter((child): child is ElementNodeOf<TElementType> => {
    const element = (child as undefined | Partial<HtmlElementNode>)?.data
      ?.element;
    return !!element && isElementOfType(element, elementType);
  });

const sumColumnSpans = (
  cellNodes: ReadonlyArray<ElementNodeOf<'tableCell'>>,
): number =>
  cellNodes.reduce(
    (total, cellNode) =>
      total + Math.max(cellNode.data.element.elementOptions.colSpan ?? 1, 1),
    0,
  );

/**
 * The `w:tblGrid`, in twips.
 *
 * Absolute column widths are written through; unitless weights divide the
 * table between the columns, which is the same share the browser gives them as
 * a percentage on a `<col>`. Without any, the columns are equal, because Word
 * has no content-driven grid to fall back on the way the browser does.
 */
const toColumnWidthsTwip = (
  columnWidths: ConfigByElementType['table']['columnWidths'],
  {
    columnCount,
    tableWidthTwip,
  }: { columnCount: number; tableWidthTwip: number },
): ReadonlyArray<number> => {
  if (!columnWidths) {
    return Array.from({ length: columnCount }, () =>
      Math.round(tableWidthTwip / columnCount),
    );
  }
  if (typeof columnWidths[0] === 'number') {
    const weights = columnWidths as ReadonlyArray<number>;
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return weights.map((weight) =>
      Math.round((tableWidthTwip * weight) / total),
    );
  }
  return (columnWidths as ReadonlyArray<UnitsSize>).map(toWholeTwip);
};

/**
 * Builds the blocks of one cell. A `w:tc` without a block-level child makes
 * the document unreadable, so bare runs are gathered into a paragraph of their
 * own; `htmlToDocx` owns that rule for every container it fills.
 */
export type TableCellChildren = (
  children: ReadonlyArray<unknown>,
  options: {
    paragraphOptions?: IParagraphPropertiesOptions;
    keepLines: boolean;
  },
) => ReadonlyArray<Paragraph | Table>;

export type TableToDocxOptions = {
  fonts: FontsConfig;
  /** The width of one line of text, in twips: the page or column text width. */
  contentWidthTwip: number;
  /** The table sits inside a `BreakAvoid`. */
  keepChildrenTogether: boolean;
  /** The document's fragmentation rules for tables. */
  tableRules: FragmentationRules['tables'];
  toCellChildren: TableCellChildren;
};

/**
 * One `Table` element and everything under it, as the `docx` objects Word reads
 * the same way a browser reads the `<table>`.
 *
 * A table with no rows returns nothing: a `w:tbl` without a `w:tr` makes the
 * document unreadable, and an empty table is not worth breaking a file for.
 */
export const tableToDocx = (
  node: HtmlElementNode,
  {
    columnWidths,
    width,
    borders,
    cellPadding,
    align,
    repeatHeader,
  }: ConfigByElementType['table'],
  {
    fonts,
    contentWidthTwip,
    keepChildrenTogether,
    tableRules,
    toCellChildren,
  }: TableToDocxOptions,
): Table | ReadonlyArray<never> => {
  // A `w:tr` without a `w:tc` makes the document unreadable, and a row with no
  // cells occupies no space in the browser either, so it is dropped rather than
  // given a cell one target would draw and the other would not.
  const rowNodes = selectElementNodes(node.children, 'tableRow').filter(
    (rowNode) => selectElementNodes(rowNode.children, 'tableCell').length > 0,
  );
  if (rowNodes.length === 0) {
    return [];
  }

  const cellNodesByRow = rowNodes.map((rowNode) =>
    selectElementNodes(rowNode.children, 'tableCell'),
  );

  const columnCount = Math.max(
    columnWidths?.length ?? 0,
    ...cellNodesByRow.map(sumColumnSpans),
  );

  const tableWidthTwip =
    typeof width === 'number'
      ? Math.round((contentWidthTwip * width) / PERCENT)
      : toWholeTwip(width);

  const columnWidthsTwip = toColumnWidthsTwip(columnWidths, {
    columnCount,
    tableWidthTwip,
  });

  const cellPaddingTwip = toWholeTwip(cellPadding);

  const rows = rowNodes.map((rowNode, rowIndex) => {
    const {
      elementOptions: { header, keepTogether, height },
    } = rowNode.data.element;

    let columnIndex = 0;
    const cells = cellNodesByRow[rowIndex].map((cellNode) => {
      const {
        elementOptions: {
          colSpan,
          rowSpan,
          verticalAlign,
          background,
          width: cellWidth,
        },
      } = cellNode.data.element;
      const span = Math.max(colSpan ?? 1, 1);
      // A cell is as wide as the columns it covers, which is what the browser
      // gives it under `table-layout: fixed`.
      const spannedWidthTwip = columnWidthsTwip
        .slice(columnIndex, columnIndex + span)
        .reduce((total, columnWidth) => total + columnWidth, 0);
      columnIndex += span;

      return new TableCell({
        ...(span > 1 && { columnSpan: span }),
        // `docx` writes the `w:vMerge` continuation cells into the rows below
        // from this one number.
        ...(rowSpan !== undefined && rowSpan > 1 && { rowSpan }),
        ...(verticalAlign && {
          verticalAlign: DOCX_VERTICAL_ALIGN[verticalAlign],
        }),
        ...(background && {
          shading: {
            type: ShadingType.CLEAR,
            color: 'auto',
            fill: toDocxColor(background),
          },
        }),
        width:
          cellWidth === undefined
            ? { size: spannedWidthTwip, type: WidthType.DXA }
            : toWidthOption(cellWidth),
        children: [
          ...toCellChildren(cellNode.children, {
            // A cell's own typography -- and the row's, which it inherits --
            // reaches Word as the properties of the paragraphs inside it.
            paragraphOptions: parseParagraphOptions(
              fonts,
              cellNode.data.elementsContext.contentOptions,
            ),
            keepLines: keepChildrenTogether,
          }),
        ],
      });
    });

    return new TableRow({
      // `never`: tables break only between rows, so no row splits in Word.
      ...((keepTogether || tableRules.splitRows === 'never') && {
        cantSplit: true,
      }),
      ...(header &&
        (tableRules.repeatHeader === 'always' ||
          (tableRules.repeatHeader === 'option' && repeatHeader)) && {
          tableHeader: true,
        }),
      ...(height && {
        height: { value: toWholeTwip(height), rule: HeightRule.ATLEAST },
      }),
      children: cells,
    });
  });

  return new Table({
    rows,
    width: toWidthOption(width),
    columnWidths: [...columnWidthsTwip],
    borders: toTableBorders(borders),
    margins: {
      top: cellPaddingTwip,
      bottom: cellPaddingTwip,
      left: cellPaddingTwip,
      right: cellPaddingTwip,
    },
    // Declared widths are only honoured exactly under the fixed algorithm,
    // which is the one the browser is put into by `table-layout: fixed`.
    layout: columnWidths ? TableLayoutType.FIXED : TableLayoutType.AUTOFIT,
    ...(align && { alignment: DOCX_TABLE_ALIGNMENT[align] }),
  });
};
