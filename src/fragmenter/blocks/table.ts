import {
  FIT_EPSILON_PX,
  unitCountOf,
  type BoundaryKind,
  type MeasuredBlock,
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
 * Tables: units are body rows, and slices of a row between its cells' lines.
 * A continuation carries the header rows when it repeats them. A row splits
 * when the profile lets rows split and the row is not kept together, and any
 * row taller than a whole box splits regardless.
 */
export const tableSplitter: Splitter = {
  pieceHeight: (block, from, to, { repeatHeader }) =>
    pieceHeightOfUnits(block, from, to) +
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
