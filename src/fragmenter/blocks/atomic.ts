import type { Splitter } from '../profile';
import { pieceHeightOfUnits } from './text';

/** Flex and grid rows, images and other blocks that only ever move whole. */
export const atomicSplitter: Splitter = {
  pieceHeight: (block, from, to) => pieceHeightOfUnits(block, from, to),
  canBreakAt: () => false,
  minUnits: () => ({ orphans: 1, widows: 1 }),
};
