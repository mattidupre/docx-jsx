import {
  FIT_EPSILON_PX,
  unitCountOf,
  type BoundaryKind,
  type MeasuredBlock,
  type SplitRow,
} from '../model';
import type { Splitter } from '../profile';
import { pieceHeightOfUnits } from './text';

const opensRow = (kind: BoundaryKind): boolean =>
  kind === 'row' || kind === 'edge';

/** The height of the row that unit boundary `index` falls inside. */
const rowHeightAround = (block: MeasuredBlock, index: number): number => {
  const unitCount = unitCountOf(block);
  let start = index;
  while (start > 0 && !opensRow(block.boundaries[start])) {
    start -= 1;
  }
  let end = index;
  while (end < unitCount && !opensRow(block.boundaries[end])) {
    end += 1;
  }
  return (
    (end === unitCount ? block.height : block.bounds[end]) - block.bounds[start]
  );
};

/**
 * The split row that unit boundary `index` cuts, and how many lines of each
 * of its cells come before the cut.
 */
const cutAt = (
  block: MeasuredBlock,
  index: number,
): undefined | { row: SplitRow; cut: ReadonlyArray<number> } => {
  const row = block.splitRows.find(
    ({ unit, cuts }) => index > unit && index <= unit + cuts.length,
  );
  const cut = row?.cuts[index - row.unit - 1];
  return row && cut && { row, cut };
};

/**
 * The height of a piece of a split row: each cell shows its lines from the
 * cut `from` (the top of the row when `undefined`) to the cut `to` (the end
 * of the row), and keeps its insets. The piece is as tall as its tallest
 * cell.
 */
const rowPieceHeight = (
  { height, cells }: SplitRow,
  from: undefined | ReadonlyArray<number>,
  to: undefined | ReadonlyArray<number>,
): number => {
  if (!from && !to) {
    return height;
  }
  return Math.max(
    0,
    ...cells.map(({ lines, insetTop, insetBottom, bottom }, cellIndex) => {
      const first = from?.[cellIndex] ?? 0;
      const end = to?.[cellIndex] ?? lines.length;
      if (end <= first && lines.length > 0) {
        // None of the cell's lines is on this piece: its insets only.
        return insetTop + insetBottom;
      }
      const top = first === 0 ? 0 : lines[first].top - insetTop;
      return (
        (end === lines.length ? bottom : lines[end - 1].bottom + insetBottom) -
        top
      );
    }),
  );
};

/**
 * The height of units `[from, to)` of a table. A piece that starts or ends
 * inside a split row takes that row's piece at its own height.
 */
const tablePieceHeight = (
  block: MeasuredBlock,
  from: number,
  to: number,
): number => {
  const unitCount = unitCountOf(block);
  const start = from === 0 ? undefined : cutAt(block, from);
  const end = to === unitCount ? undefined : cutAt(block, to);
  if (!start && !end) {
    return pieceHeightOfUnits(block, from, to);
  }
  if (start && end && start.row === end.row) {
    return rowPieceHeight(start.row, start.cut, end.cut);
  }
  const top = start
    ? block.bounds[start.row.unit] +
      start.row.height -
      rowPieceHeight(start.row, start.cut, undefined)
    : from === 0
      ? 0
      : block.bounds[from];
  const bottom = end
    ? block.bounds[end.row.unit] + rowPieceHeight(end.row, undefined, end.cut)
    : to === unitCount
      ? block.height
      : block.bounds[to];
  return bottom - top;
};

/**
 * Tables: units are body rows, and pieces of a row between its cells' lines.
 * A continuation carries the header rows when it repeats them. A row splits
 * when the profile lets rows split and the row is not kept together, and any
 * row taller than a whole box splits regardless.
 */
export const tableSplitter: Splitter = {
  pieceHeight: (block, from, to, { repeatHeader }) =>
    tablePieceHeight(block, from, to) +
    (from > 0 && repeatHeader ? block.repeatHeight : 0),
  canBreakAt: (block, index, context, profile) => {
    const kind = block.boundaries[index];
    if (kind === 'row') {
      return true;
    }
    if (kind !== 'within-row' && kind !== 'within-kept-row') {
      return false;
    }
    const oversized =
      rowHeightAround(block, index) +
        (context.repeatHeader ? block.repeatHeight : 0) >
      context.boxHeight + FIT_EPSILON_PX;
    return (
      oversized ||
      (kind === 'within-row' && profile.tables.splitRows === 'unless-kept')
    );
  },
  minUnits: () => ({ orphans: 1, widows: 1 }),
};
