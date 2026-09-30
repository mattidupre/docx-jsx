import { unitCountOf, type MeasuredBlock } from '../model';
import type { Splitter } from '../profile';

/**
 * The height of units `[from, to)`: a continuation drops the block's top
 * border and padding, and a piece that stops early drops its bottom ones.
 */
export const pieceHeightOfUnits = (
  block: MeasuredBlock,
  from: number,
  to: number,
): number =>
  (to === unitCountOf(block) ? block.height : block.bounds[to]) -
  (from === 0 ? 0 : block.bounds[from]);

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
