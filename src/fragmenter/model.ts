import type { FragmentationStartKind } from '../entities';

/**
 * The measured block model the Fragmenter places, and the page state it
 * places it into. Everything here is plain data: the measuring step produces
 * it from the DOM once, the placement core and the profile hooks read it
 * without touching the DOM, and the render step maps it back to nodes.
 *
 * Lengths are CSS px, relative to the block's border box unless stated.
 */

/**
 * How a leaf block breaks, and the key its splitter is registered under:
 * - `text`: a paragraph, heading or other run of line boxes;
 * - `list`: a list item, whose continuation draws no second marker;
 * - `table`: a table, whose units are rows or slices of a row;
 * - `atomic`: anything that moves whole (a flex or grid row, an image).
 */
export type BlockKind = 'text' | 'list' | 'table' | 'atomic';

/**
 * What a measured element is to the Fragmenter: a leaf of one of the
 * {@link BlockKind}s, or a `container` whose children are visited instead.
 */
export type ElementKind = BlockKind | 'container';

export type StartKind = FragmentationStartKind;

/**
 * The kind of one boundary between two units of a block. A block may break at
 * a boundary when its splitter says so; the outer two boundaries never break.
 * - `line`: between two line boxes;
 * - `blocked`: between two line boxes that a float spans;
 * - `row`: between two table rows;
 * - `within-row`: inside a row that may split;
 * - `within-kept-row`: inside a row that is kept together, which only splits
 *   when it is taller than a whole box.
 */
export type BoundaryKind =
  'edge' | 'line' | 'blocked' | 'row' | 'within-row' | 'within-kept-row';

export type ColumnFill = 'auto' | 'balance' | 'balance-all';

/** A run of blocks laid out in columns (a multi-column stack). */
export type MeasuredRegion = {
  /** Unique within its stack measurement. */
  id: number;
  columnCount: number;
  columnGap: number;
  /** The computed `column-fill` of the multi-column element. */
  fill: ColumnFill;
  /**
   * For masonry columns, how many units the region holds: its element
   * children other than a Break or a `<br>`, which move whole to the
   * shortest column. `undefined` for columns that flow.
   */
  masonry: undefined | { unitCount: number };
};

/** A leaf block, measured once at the content width of its stack. */
export type MeasuredBlock = {
  stackIndex: number;
  /** Position in its stack's measurement, which identifies the block. */
  index: number;
  kind: BlockKind;
  region: undefined | MeasuredRegion;
  /**
   * In a masonry region, the unit the block belongs to: the index of the
   * region's child element it is in, and whether it is the unit's first
   * block. `undefined` anywhere else.
   */
  unit: undefined | { index: number; opens: boolean };
  height: number;
  /**
   * The collapsible margin above the block: its own, collapsed with the
   * margins of the containers it opens that nothing separates it from. This is
   * the margin a profile truncates at the top of a box.
   */
  marginTop: number;
  /**
   * Borders, paddings and inner margins of the containers the block opens,
   * between {@link marginTop} and the block's border box.
   */
  insetTop: number;
  /** As {@link marginTop}, below the block and the containers it closes. */
  marginBottom: number;
  /** As {@link insetTop}, for the containers the block closes. */
  insetBottom: number;
  /**
   * Unit boundaries: `bounds[0]` is the top of the first unit (line or row),
   * `bounds[unitCount]` the bottom of the last. `bounds.length` is one more
   * than the number of units.
   */
  bounds: ReadonlyArray<number>;
  /** The kind of every boundary in {@link bounds}. */
  boundaries: ReadonlyArray<BoundaryKind>;
  /** Height repeated at the top of every continuation (a table's header). */
  repeatHeight: number;
  /** The table asks for its header rows to repeat (`repeatHeader`). */
  repeatHeader: boolean;
  /** `break-inside: avoid`, on the block or a group it belongs to. */
  keepLines: boolean;
  /** `break-after: avoid`: keep with the start of the next block. */
  keepNext: boolean;
  /** `break-before: avoid`: keep with the end of the previous block. */
  keepPrevious: boolean;
  /** A forced break before the block. */
  breakBefore: undefined | 'page' | 'column';
  /** The computed `orphans` and `widows`. */
  orphans: number;
  widows: number;
  /**
   * For a block whose text box is trimmed (`text-box: trim-both`), its line
   * height and the cap height its first line is trimmed to. Its inner
   * {@link bounds} are then the baselines of its lines: the bottom of a
   * trimmed piece that ends there.
   */
  trim: undefined | { lineHeight: number; capHeight: number };
};

/** One stack, measured at one content size. */
export type MeasuredStack = {
  /** The width the stack was laid out at. */
  width: number;
  blocks: ReadonlyArray<MeasuredBlock>;
  /** A forced break after the last block, which applies to what follows. */
  breakAfter: undefined | 'page';
};

export type BoxSize = { width: number; height: number };

/** Layout noise tolerated when comparing a height with the space left. */
export const FIT_EPSILON_PX = 0.5;

export const unitCountOf = (block: MeasuredBlock): number =>
  block.bounds.length - 1;

/** A block, or what is left of it: units `from` onwards. */
export type Piece = { block: MeasuredBlock; from: number };

/** Units `[from, to)` of a block, placed in a box. */
export type Placement = {
  block: MeasuredBlock;
  from: number;
  to: number;
  /**
   * The space placed above the block's insets, after collapsing. A
   * continuation has none, unless the profile insets a trimmed first line.
   */
  marginTop: number;
  /** Whether a table continuation carries its header rows. */
  repeatHeader: boolean;
  /** Where the placement's border box ends, from the top of its box. */
  bottom: number;
};

export type PageItem =
  | { kind: 'flow'; placement: Placement }
  | {
      kind: 'region';
      region: MeasuredRegion;
      columns: ReadonlyArray<ReadonlyArray<Placement>>;
    };

/**
 * One unit of a masonry region in one column. The packed order is the list of
 * these, page by page and column by column, top to bottom: the order units are
 * read in and shown in, in every target. A unit split across columns has one
 * entry per column, and the entry after it is its continuation.
 */
export type PackedUnit = {
  stackIndex: number;
  /** The unit's index in its region, which is its place in the source. */
  unit: number;
  pageIndex: number;
  columnIndex: number;
};

/**
 * What a layout run hands a target that cannot lay out itself (the DOCX): the
 * packing of every masonry stack. It is plain data, so it crosses from the
 * browser the layout ran in.
 */
export type FragmentationLayout = {
  /** How many stacks were laid out. */
  stackCount: number;
  /** How many units each stack with masonry columns has. */
  masonryStacks: ReadonlyArray<{ stackIndex: number; unitCount: number }>;
  /** Every masonry unit, in packed order. */
  packedOrder: ReadonlyArray<PackedUnit>;
};

export type PlacedPage = {
  /** The stack whose content starts the page. */
  stackIndex: number;
  /** Whether the page starts that stack, i.e. takes its `first` layout. */
  first: boolean;
  startKind: StartKind;
  size: BoxSize;
  items: ReadonlyArray<PageItem>;
};

/** A piece of the queue by reference to the model, so it serializes. */
export type PieceRef = { stackIndex: number; index: number; from: number };

/**
 * Everything needed to make the pages from one page onwards again: the queue
 * and the rule state at the start of that page. It is plain data, so a
 * re-pagination can resume from the first page an edit changed.
 */
export type Checkpoint = {
  pageIndex: number;
  queue: ReadonlyArray<PieceRef>;
  /** How many stacks had been measured into the queue. */
  loadedStackCount: number;
  /** The size each loaded stack was measured at. */
  stackSizes: ReadonlyArray<BoxSize>;
  /** Stacks whose first block opens with a forced page break. */
  forcedStarts: ReadonlyArray<number>;
  /** A forced break still waiting for a block to apply to. */
  pendingBreak: boolean;
  startKind: StartKind;
  /**
   * How many entries of the packed order the pages before this one made. A
   * run resumed from here packs the rest the same way, and its packed order
   * follows on from that many entries of the full run's.
   */
  packedCount: number;
};

/** What a hook knows about the box it is placing into. */
export type PageContext = {
  pageIndex: number;
  stackIndex: number;
  /** How the current box started. */
  startKind: StartKind;
  /** The full height of the current box (page or column). */
  boxHeight: number;
  /** How much of it is filled already. */
  used: number;
  /** The column index inside a region, `undefined` outside columns. */
  columnIndex: undefined | number;
};
