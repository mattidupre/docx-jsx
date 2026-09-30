import { unitCountOf, type MeasuredBlock } from '../model';
import type { Splitter } from '../profile';

/**
 * The height of units `[from, to)`: a continuation drops the block's top
 * border and padding, and a piece that stops early drops its bottom ones.
 *
 * A trimmed block's boundaries are the baselines of its lines, so a piece
 * that stops early ends at its last baseline, as a trimmed box does. A
 * continuation is trimmed again at its own first line, to its cap height:
 * the line above the boundary, less the cap height, is not part of it.
 */
export const pieceHeightOfUnits = (
  block: MeasuredBlock,
  from: number,
  to: number,
): number =>
  (to === unitCountOf(block) ? block.height : block.bounds[to]) -
  (from === 0
    ? 0
    : block.bounds[from] +
      (block.trim ? block.trim.lineHeight - block.trim.capHeight : 0));

const resolveLineRule = (rule: number | 'style', fromStyle: number): number =>
  Math.max(1, rule === 'style' ? fromStyle : rule);

/** Paragraphs and headings: they break between line boxes. */
export const textSplitter: Splitter = {
  pieceHeight: (block, from, to) => pieceHeightOfUnits(block, from, to),
  canBreakAt: (block, index) => block.boundaries[index] === 'line',
  minUnits: (block, { lines }) => ({
    orphans: resolveLineRule(lines.orphans, block.orphans),
    widows: resolveLineRule(lines.widows, block.widows),
  }),
};
