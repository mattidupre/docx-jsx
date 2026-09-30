import type { ElementType, FragmentationRules } from '../entities';
import type {
  BlockKind,
  ElementKind,
  MeasuredBlock,
  PageContext,
} from './model';

/**
 * What {@link FragmentationProfile.classify} is told about an element: its
 * computed box and what the library knows of it, never the element itself.
 */
export type ClassifyInput = {
  /** Lower case, e.g. `p`, `table`, `svg`. */
  tagName: string;
  display: string;
  float: string;
  overflowY: string;
  /** The library element the node renders, when it is one. */
  elementType: undefined | ElementType;
  /** Whether the element has text of its own beside its element children. */
  hasOwnText: boolean;
  childElementCount: number;
  /** What the Fragmenter makes of the element unless the hook says otherwise. */
  defaultKind: ElementKind;
};

/** What a splitter knows about the box a block is being split into. */
export type SplitContext = PageContext & {
  /** Whether the piece being split carries a repeated table header. */
  repeatHeader: boolean;
};

/**
 * How one kind of block is cut: pure arithmetic over its measured units. The
 * matching DOM work (cloning the fragment of a block) belongs to the render
 * step, keyed by the same {@link BlockKind}.
 */
export type Splitter = {
  /** The height of units `[from, to)` placed as one piece. */
  pieceHeight: (
    block: MeasuredBlock,
    from: number,
    to: number,
    options: { repeatHeader: boolean },
  ) => number;
  /** Whether the block may break before unit `index`. */
  canBreakAt: (
    block: MeasuredBlock,
    index: number,
    context: SplitContext,
    profile: FragmentationProfile,
  ) => boolean;
  /** The fewest units left before a break and carried after it. */
  minUnits: (
    block: MeasuredBlock,
    profile: FragmentationProfile,
  ) => { orphans: number; widows: number };
};

/** A break the Fragmenter is about to make: units `[from, to)` stay. */
export type BreakCandidate = {
  block: MeasuredBlock;
  from: number;
  to: number;
};

/**
 * The conventions one render is paginated by: the {@link FragmentationRules}
 * as data, plus narrow hooks for what the rules cannot express. Every hook is
 * a pure function of the measured model and the page context; none of them
 * sees the DOM. A profile is created per render and passed explicitly.
 */
export type FragmentationProfile = FragmentationRules & {
  name: string;
  /** Which kind of block an element is, or `container` to visit its children. */
  classify?: (input: ClassifyInput) => ElementKind;
  /** Return false to forbid a break between two consecutive blocks. */
  canBreakBetween?: (
    before: MeasuredBlock,
    after: MeasuredBlock,
    context: PageContext,
  ) => boolean;
  /**
   * Moves a chosen break inside a block. The result is the new `to`; it may
   * only move the break earlier, down to `from` (nothing of the block stays).
   */
  adjustBreak?: (candidate: BreakCandidate, context: PageContext) => number;
  splitters: Readonly<Record<BlockKind, Splitter>>;
};

export const isFragmentationProfile = (
  value: unknown,
): value is FragmentationProfile =>
  typeof value === 'object' && value !== null && 'splitters' in value;
