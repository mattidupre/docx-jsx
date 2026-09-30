import {
  convertUnits,
  toUnits,
  wordSpaceAboveCapHeight,
  wordSpaceBelowBaseline,
} from '../entities';
import {
  FIT_EPSILON_PX,
  unitCountOf,
  type BoxSize,
  type Checkpoint,
  type MeasuredBlock,
  type MeasuredRegion,
  type MeasuredStack,
  type PackedUnit,
  type PageContext,
  type PageItem,
  type Piece,
  type PieceRef,
  type PlacedPage,
  type StackMeasurement,
  type Placement,
  type StartKind,
} from './model';
import type { FragmentationProfile, SplitContext } from './profile';

/**
 * The placement core: fills pages from the measured model by arithmetic.
 * Nothing here reads or writes the DOM; stacks are measured through the
 * `measureStack` callback, which the caller backs with the DOM and a test
 * backs with synthetic data.
 */
export type PlacementInput = {
  profile: FragmentationProfile;
  /**
   * One entry per stack, in document order. A continuous stack carries on
   * down the page of the stack before it; any other one starts a page.
   */
  stacks: ReadonlyArray<{ continuous: boolean }>;
  /**
   * Measures a stack at the content size of the page it starts on, and again
   * at the size of a later page of another width. `continuations` are the
   * pieces of its measurement before that carry on: the rest of each is
   * measured as a block of its own, at the same index, which is a
   * {@link MeasuredBlock.continuation}.
   */
  measureStack: (
    stackIndex: number,
    size: BoxSize,
    continuations: ReadonlyArray<Piece>,
  ) => MeasuredStack;
  /** Starts a page and returns the size of its content box. */
  startPage: (context: {
    pageIndex: number;
    stackIndex: number;
    first: boolean;
  }) => BoxSize;
  /** A checkpoint of an earlier run over the same input to resume from. */
  resumeFrom?: Checkpoint;
};

export type PlacementResult = {
  pages: ReadonlyArray<PlacedPage>;
  /** The state at the start of every page, `checkpoints[i]` for page `i`. */
  checkpoints: ReadonlyArray<Checkpoint>;
  /**
   * Every masonry unit placed, in packed order: page by page, column by
   * column, top to bottom. A resumed run lists those of its own pages, which
   * follow the checkpoint's `packedCount` entries of the full run's.
   */
  packedOrder: ReadonlyArray<PackedUnit>;
};

type FillStop = 'end' | 'full' | 'forced-page' | 'forced-column' | 'region';

type FillResult = {
  placed: Array<Placement>;
  used: number;
  rest: Array<Piece>;
  stop: FillStop;
};

type Box = {
  height: number;
  /** How the box started, or `undefined` part way down a page. */
  atTop: undefined | StartKind;
  isColumn: boolean;
  /** Whether the box must take something even if nothing fits. */
  mustProgress: boolean;
  /** Whether the page has content above the box, so a forced break applies. */
  hasContentAbove: boolean;
  /**
   * The bottom margin of the block right above the box, for a box that goes
   * on below content in the same column: the first block's top margin
   * combines with it as it would with a block placed in the box.
   */
  marginAbove?: number;
  /**
   * The margin the content above leaves between it and the box, drawn
   * already, for a box that starts below content in another formatting
   * context (columns below flow content, flow content below columns). The
   * first block's top margin combines with it by the profile's rule, and
   * the block keeps only what is left of the combined margin.
   */
  spaceAbove?: number;
  context: Omit<PageContext, 'used'>;
};

const sameRegion = (
  block: MeasuredBlock,
  region: undefined | { stackIndex: number; region: MeasuredRegion },
): boolean =>
  region === undefined
    ? block.region === undefined
    : block.region?.id === region.region.id &&
      block.stackIndex === region.stackIndex;

const pxToPt = (value: number) => convertUnits(toUnits(value, 'px'), 'pt');

const ptToPx = (value: number) => convertUnits(toUnits(value, 'pt'), 'px');

/**
 * Where Word draws the capitals of a trimmed block's first line, below the
 * top of a box, when the profile places trimmed lines as Word does.
 */
const trimInsetOf = (
  profile: FragmentationProfile,
  block: MeasuredBlock,
): number =>
  profile.trim.insetAtTop && block.trim
    ? ptToPx(
        wordSpaceAboveCapHeight({
          lineHeight: pxToPt(block.trim.lineHeight),
          capHeight: pxToPt(block.trim.capHeight),
        }),
      )
    : 0;

/**
 * The room below the baseline of a trimmed block's last line that Word's
 * line still needs, when the profile fits trimmed lines as Word does.
 */
const trimReserveOf = (
  profile: FragmentationProfile,
  block: MeasuredBlock,
): number =>
  profile.trim.reserveAtBottom && block.trim
    ? ptToPx(
        wordSpaceBelowBaseline({ lineHeight: pxToPt(block.trim.lineHeight) }),
      )
    : 0;

/** CSS margin collapsing: the largest positive and the most negative add. */
const collapseMargins = (a: number, b: number): number =>
  Math.max(a, b, 0) + Math.min(a, b, 0);

const combineMargins = (
  profile: FragmentationProfile,
  bottom: number,
  top: number,
): number =>
  profile.margins.adjacent === 'sum'
    ? bottom + top
    : collapseMargins(bottom, top);

const keepsTogether = (
  profile: FragmentationProfile,
  before: MeasuredBlock,
  after: MeasuredBlock,
  context: PageContext,
): boolean =>
  before.keepNext ||
  after.keepPrevious ||
  (profile.canBreakBetween !== undefined &&
    !profile.canBreakBetween(before, after, context));

/** Whether a table's continuations carry its header rows. */
export const wantsRepeatedHeader = (
  profile: FragmentationProfile,
  block: MeasuredBlock,
): boolean =>
  block.repeatHeight > 0 &&
  (profile.tables.repeatHeader === 'always' ||
    (profile.tables.repeatHeader === 'option' && block.repeatHeader));

/**
 * Whether units from `from` on open the block, rather than carry on from a
 * piece of it placed before.
 */
const opensBlock = ({ block, from }: Piece): boolean =>
  from === 0 && !block.continuation;

/** Whether a piece starts inside a table row that splits between lines. */
const startsInsideSplitRow = ({ block, from }: Piece): boolean =>
  block.splitRows.some(
    ({ unit, cuts }) => from > unit && from <= unit + cuts.length,
  );

/**
 * Where to break `block` so that units `[from, to)` stay in `space`. Returns
 * `from` when nothing of the block may stay.
 *
 * `failOpen` is for a block alone in an empty box: keeps, widows and orphans
 * are ignored and at least one unit is placed, so every page progresses.
 */
const chooseBreak = (
  profile: FragmentationProfile,
  block: MeasuredBlock,
  from: number,
  space: number,
  context: SplitContext,
  failOpen: boolean,
): number => {
  const splitter = profile.splitters[block.kind];
  const unitCount = unitCountOf(block);
  const heightOf = (to: number) =>
    splitter.pieceHeight(block, from, to, {
      repeatHeader: context.repeatHeader,
    });
  const allowed = (index: number) =>
    splitter.canBreakAt(block, index, context, profile);

  let best = from;
  for (let to = from + 1; to < unitCount; to += 1) {
    if (heightOf(to) > space + FIT_EPSILON_PX) {
      break;
    }
    if (allowed(to)) {
      best = to;
    }
  }

  if (failOpen) {
    if (best > from) {
      return best;
    }
    // Nothing fits: take the smallest piece the block allows, or all of it.
    for (let to = from + 1; to < unitCount; to += 1) {
      if (allowed(to)) {
        return to;
      }
    }
    return unitCount;
  }

  if (block.keepLines || best === from) {
    return from;
  }
  const { orphans, widows } = splitter.minUnits(block, profile);
  if (unitCount - best < widows) {
    let earlier = unitCount - widows;
    while (earlier > from && !allowed(earlier)) {
      earlier -= 1;
    }
    best = Math.min(best, earlier);
  }
  if (best - from < (opensBlock({ block, from }) ? orphans : 1)) {
    return from;
  }
  const adjusted = profile.adjustBreak
    ? profile.adjustBreak({ block, from, to: best }, context)
    : best;
  return Math.min(Math.max(adjusted, from), best);
};

/**
 * Fills one box (a page, what is left of it, or one column) from the front
 * of `input`. `loadMore` appends the next continuous stack when the input
 * runs out, so a keep chain reaches across the stack boundary.
 */
const fill = (
  profile: FragmentationProfile,
  input: ReadonlyArray<Piece>,
  box: Box,
  region: undefined | { stackIndex: number; region: MeasuredRegion },
  loadMore?: () => undefined | ReadonlyArray<Piece>,
): FillResult => {
  const pieces = [...input];
  const placed: Array<Placement> = [];
  let used = 0;
  let previousMarginBottom = box.marginAbove ?? 0;
  let index = 0;
  const contextNow = (): PageContext => ({ ...box.context, used });
  const stopWith = (stop: FillStop, rest: Array<Piece>): FillResult => ({
    placed,
    used,
    rest,
    stop,
  });

  for (;;) {
    if (index >= pieces.length) {
      const more = loadMore?.();
      if (more === undefined) {
        return stopWith('end', []);
      }
      pieces.push(...more);
      continue;
    }
    const { block, from } = pieces[index];
    if (!sameRegion(block, region)) {
      return stopWith(region ? 'end' : 'region', pieces.slice(index));
    }
    const last = placed.at(-1);
    if (
      (last || box.hasContentAbove) &&
      from === 0 &&
      block.breakBefore === 'page'
    ) {
      return stopWith('forced-page', pieces.slice(index));
    }
    if (last && from === 0 && block.breakBefore === 'column' && box.isColumn) {
      return stopWith('forced-column', pieces.slice(index));
    }

    const splitter = profile.splitters[block.kind];
    const unitCount = unitCountOf(block);
    const opening = opensBlock({ block, from });
    const collapsedMarginTop = !opening
      ? 0
      : last || box.marginAbove !== undefined
        ? combineMargins(profile, previousMarginBottom, block.marginTop)
        : box.spaceAbove !== undefined
          ? combineMargins(profile, box.spaceAbove, block.marginTop) -
            box.spaceAbove
          : box.atTop === undefined || profile.margins.keepAtTop[box.atTop]
            ? block.marginTop
            : 0;
    // A trimmed first line at the top of a box goes where Word puts it; the
    // margin kept above it is part of that space, not added to it.
    const trimInset =
      !last && box.atTop !== undefined ? trimInsetOf(profile, block) : 0;
    const marginTop =
      trimInset > 0
        ? Math.max(collapsedMarginTop, trimInset)
        : collapsedMarginTop;
    const top = used + marginTop + (opening ? block.insetTop : 0);
    const heightOf = (to: number, repeatHeader: boolean) =>
      splitter.pieceHeight(block, from, to, { repeatHeader }) +
      (to === unitCount ? block.insetBottom : 0);
    const reserve = trimReserveOf(profile, block);
    const fits = (to: number, repeatHeader: boolean) =>
      top + heightOf(to, repeatHeader) + reserve <= box.height + FIT_EPSILON_PX;

    // A table measured again from a continuation holds the header its first
    // piece repeats, so only a later piece repeats it.
    let repeatHeader = from > 0 && wantsRepeatedHeader(profile, block);
    // A repeated header with no row under it is dropped rather than moved on.
    if (
      repeatHeader &&
      !last &&
      !fits(from + 1, true) &&
      fits(from + 1, false)
    ) {
      repeatHeader = false;
    }

    const place = (to: number) => {
      const bottom = top + heightOf(to, repeatHeader);
      placed.push({ block, from, to, marginTop, repeatHeader, bottom });
      used = bottom;
      previousMarginBottom = to === unitCount ? block.marginBottom : 0;
    };
    const restAfter = (to: number): Array<Piece> =>
      to < unitCount
        ? [{ block, from: to }, ...pieces.slice(index + 1)]
        : pieces.slice(index + 1);

    if (fits(unitCount, repeatHeader)) {
      place(unitCount);
      index += 1;
      continue;
    }

    const splitContext: SplitContext = { ...contextNow(), repeatHeader };
    const to = chooseBreak(
      profile,
      block,
      from,
      box.height - top - reserve,
      splitContext,
      false,
    );
    if (to > from) {
      place(to);
      return stopWith('full', restAfter(to));
    }

    if (!last) {
      if (!box.mustProgress) {
        return stopWith('full', pieces.slice(index));
      }
      const forced = chooseBreak(
        profile,
        block,
        from,
        box.height - top - reserve,
        splitContext,
        true,
      );
      place(forced);
      return stopWith('full', restAfter(forced));
    }

    // Move a trailing keep chain along with the block that did not fit. A
    // chain that reaches the top of the box cannot be kept and stays.
    let chainStart = placed.length;
    let next = block;
    while (chainStart > 0) {
      const candidate = placed[chainStart - 1];
      const whole =
        opensBlock(candidate) && candidate.to === unitCountOf(candidate.block);
      if (
        !whole ||
        !keepsTogether(profile, candidate.block, next, contextNow())
      ) {
        break;
      }
      next = candidate.block;
      chainStart -= 1;
    }
    if (chainStart > 0 && chainStart < placed.length) {
      const moved = placed
        .splice(chainStart)
        .map((placement): Piece => ({ block: placement.block, from: 0 }));
      used = placed[chainStart - 1].bottom;
      return stopWith('full', [...moved, ...pieces.slice(index)]);
    }
    return stopWith('full', pieces.slice(index));
  }
};

type ColumnsResult = {
  columns: Array<Array<Placement>>;
  used: number;
  /**
   * Where the columns end with the bottom margins of their last blocks: each
   * column is a formatting context of its own, which holds those margins, so
   * the region takes that much of the page.
   */
  extent: number;
  rest: Array<Piece>;
  forcedPage: boolean;
};

/** The margin a column's last placement leaves below it inside the column. */
const marginBelowOf = (placements: ReadonlyArray<Placement>): number => {
  const last = placements.at(-1);
  return last && last.to === unitCountOf(last.block)
    ? last.block.marginBottom
    : 0;
};

const fillColumns = (
  profile: FragmentationProfile,
  pieces: ReadonlyArray<Piece>,
  region: { stackIndex: number; region: MeasuredRegion },
  height: number,
  atTop: undefined | StartKind,
  mustProgress: boolean,
  hasContentAbove: boolean,
  spaceAbove: undefined | number,
  context: Omit<PageContext, 'used'>,
): ColumnsResult => {
  const columns: Array<Array<Placement>> = [];
  let rest: Array<Piece> = [...pieces];
  let used = 0;
  let extent = 0;
  let forcedPage = false;
  for (
    let column = 0;
    column < region.region.columnCount && rest.length > 0;
    column += 1
  ) {
    const startKind = column === 0 ? atTop : 'column';
    const result = fill(
      profile,
      rest,
      {
        height,
        atTop: startKind,
        isColumn: true,
        mustProgress: mustProgress && column === 0,
        hasContentAbove: hasContentAbove && column === 0,
        spaceAbove: column === 0 ? spaceAbove : undefined,
        context: {
          ...context,
          startKind: startKind ?? context.startKind,
          boxHeight: height,
          columnIndex: column,
        },
      },
      region,
    );
    columns.push(result.placed);
    used = Math.max(used, result.used);
    extent = Math.max(extent, result.used + marginBelowOf(result.placed));
    rest = result.rest;
    if (result.stop === 'forced-page') {
      forcedPage = true;
      break;
    }
  }
  return { columns, used, extent, rest, forcedPage };
};

/**
 * How many packing units after one that fits in no column are tried in its
 * place, in source order, before the page ends. It bounds how far masonry
 * moves a unit ahead of the ones before it.
 */
export const MASONRY_LOOKAHEAD = 8;

type MasonryColumn = {
  placed: Array<Placement>;
  /** Where its last border box ends, from the top of the region. */
  bottom: number;
  /** The bottom margin below that border box. */
  marginBottom: number;
  /** Its last piece carries on at the top of the next column. */
  sealed: boolean;
};

/** The forced break a packing unit opens with, if any. */
const openingBreakOf = (
  pieces: ReadonlyArray<Piece>,
): undefined | 'page' | 'column' =>
  pieces[0]?.from === 0 ? pieces[0].block.breakBefore : undefined;

/** Whether a packing unit breaks by force after its first piece. */
const breaksInside = (pieces: ReadonlyArray<Piece>): boolean =>
  pieces.some(
    ({ block, from }, index) =>
      index > 0 && from === 0 && block.breakBefore !== undefined,
  );

/** Whether a packing unit goes on with a unit begun on an earlier page. */
const continuesUnit = (pieces: ReadonlyArray<Piece>): boolean =>
  pieces[0] !== undefined &&
  (pieces[0].from > 0 || pieces[0].block.unit?.opens === false);

/** The piece without a forced break before it. */
const withoutBreak = (piece: Piece): Piece =>
  piece.block.breakBefore === undefined
    ? piece
    : { ...piece, block: { ...piece.block, breakBefore: undefined } };

/**
 * The packing units of a masonry region: its units (the pieces of one child
 * of the region), with a unit that keeps with the next one (a heading, or a
 * group marked keep-with-next) chained to it, so they move as one. A unit
 * that opens with a forced break (a Break between two units) starts a
 * packing unit of its own.
 */
const packingUnitsOf = (
  profile: FragmentationProfile,
  pieces: ReadonlyArray<Piece>,
  context: PageContext,
): Array<Array<Piece>> => {
  const units: Array<Array<Piece>> = [];
  for (const piece of pieces) {
    const unit = units.at(-1);
    if (unit && unit[0].block.unit?.index === piece.block.unit?.index) {
      unit.push(piece);
    } else {
      units.push([piece]);
    }
  }
  const packing: Array<Array<Piece>> = [];
  units.forEach((unit, index) => {
    const previous = units[index - 1]?.at(-1);
    const chain = packing.at(-1);
    if (
      chain &&
      previous &&
      openingBreakOf(unit) === undefined &&
      keepsTogether(profile, previous.block, unit[0].block, context)
    ) {
      chain.push(...unit);
    } else {
      packing.push([...unit]);
    }
  });
  return packing;
};

/**
 * Packs the units of a masonry region into the columns of one page. The
 * packing is greedy and deterministic:
 * - the packing units are taken in source order, each into the column whose
 *   content ends highest (the leftmost of equals) among those it fits in
 *   whole;
 * - when the next one fits in no column, the next {@link MASONRY_LOOKAHEAD}
 *   are tried in its place, in order, and the first that fits is placed;
 *   when none fits, the page ends;
 * - a packing unit too tall for an empty column of a whole page, or one with
 *   a forced break inside it, splits as flow does, under the page's rules: it
 *   starts below the last column with content, and each piece that does not
 *   end it carries on at the top of the next column, which is empty, so the
 *   unit reads on from column to column. A column whose last piece carries on
 *   takes nothing more, and what does not fit on the page goes on at the top
 *   of the next page's first column before anything else is packed there.
 *
 * The columns are then read top to bottom, left to right: that is the packed
 * order. Forced breaks keep it in source order:
 * - a page break ends the page: a packing unit that starts with one waits for
 *   a new page, and one inside a unit carries the rest of the unit to the
 *   next page, with nothing packed on this page after it;
 * - a column break moves on to the next column: a packing unit that starts
 *   with one goes into the columns right of every column with content, and
 *   one inside a unit carries the rest of the unit to the top of the next
 *   column;
 * - nothing after a forced break is packed ahead of what comes before it.
 */
const packMasonry = (
  profile: FragmentationProfile,
  pieces: ReadonlyArray<Piece>,
  region: { stackIndex: number; region: MeasuredRegion },
  height: number,
  atTop: undefined | StartKind,
  mustProgress: boolean,
  hasContentAbove: boolean,
  spaceAbove: undefined | number,
  context: Omit<PageContext, 'used'>,
): ColumnsResult => {
  const columns: Array<MasonryColumn> = Array.from(
    { length: region.region.columnCount },
    () => ({ placed: [], bottom: 0, marginBottom: 0, sealed: false }),
  );
  const pending = packingUnitsOf(profile, pieces, { ...context, used: 0 });
  const isPageEmpty = () => columns.every(({ placed }) => placed.length === 0);

  /**
   * The box below the content of a column, or the column when empty, on this
   * page or, for `wholePage`, on an empty one.
   */
  const boxOf = (
    columnIndex: number,
    boxHeight: number,
    progress: boolean,
    empty = columns[columnIndex].placed.length === 0,
    wholePage = false,
  ): Box => {
    const startKind = columnIndex === 0 ? atTop : 'column';
    return {
      height: empty ? boxHeight : boxHeight - columns[columnIndex].bottom,
      atTop: empty ? startKind : undefined,
      // A forced break inside a packing unit ends its piece in the column.
      isColumn: true,
      mustProgress: progress,
      hasContentAbove: false,
      marginAbove: empty ? undefined : columns[columnIndex].marginBottom,
      spaceAbove:
        empty && columnIndex === 0 && !wholePage ? spaceAbove : undefined,
      context: {
        ...context,
        startKind: (empty ? startKind : undefined) ?? context.startKind,
        boxHeight,
        columnIndex,
      },
    };
  };

  const commit = (columnIndex: number, result: FillResult) => {
    const column = columns[columnIndex];
    const last = result.placed.at(-1);
    if (!last) {
      return;
    }
    const top = column.bottom;
    column.placed.push(
      ...result.placed.map((placement) => ({
        ...placement,
        bottom: top + placement.bottom,
      })),
    );
    column.bottom = top + result.used;
    column.marginBottom =
      last.to === unitCountOf(last.block) ? last.block.marginBottom : 0;
  };

  /** Places a packing unit whole in the highest ending column it fits. */
  const placeWhole = (unit: ReadonlyArray<Piece>): boolean => {
    const candidates = columns
      .map((_column, columnIndex) => columnIndex)
      .filter((columnIndex) => !columns[columnIndex].sealed)
      .sort((a, b) => columns[a].bottom - columns[b].bottom || a - b);
    for (const columnIndex of candidates) {
      const result = fill(
        profile,
        unit,
        boxOf(columnIndex, height, false),
        region,
      );
      if (result.rest.length === 0) {
        commit(columnIndex, result);
        return true;
      }
    }
    return false;
  };

  /**
   * Whether a packing unit cannot go whole into an empty column of a whole
   * page, the first one or any other (their top margins may differ): it is
   * too tall, or it breaks by force inside.
   */
  const isOversized = (unit: ReadonlyArray<Piece>): boolean =>
    [0, columns.length - 1].every(
      (columnIndex) =>
        fill(
          profile,
          unit,
          boxOf(columnIndex, context.boxHeight, false, true, true),
          region,
        ).rest.length > 0,
    );

  /**
   * Splits a packing unit as flow does, from below the last column with
   * content onwards. Returns what did not fit on the page, and whether a
   * forced page break inside the unit ended the page.
   */
  const placeFlowing = (
    unit: ReadonlyArray<Piece>,
    progress: boolean,
  ): { rest: Array<Piece>; placed: boolean; pageBreak: boolean } => {
    const start = Math.max(
      0,
      columns.findLastIndex(({ placed }) => placed.length > 0),
    );
    let rest = [...unit];
    let first: undefined | number = undefined;
    let last = start;
    let pageBreak = false;
    for (
      let columnIndex = start;
      columnIndex < columns.length && rest.length > 0;
      columnIndex += 1
    ) {
      if (first !== undefined && openingBreakOf(rest) === 'page') {
        pageBreak = true;
        break;
      }
      if (columns[columnIndex].sealed) {
        if (first !== undefined) {
          break;
        }
        continue;
      }
      const result = fill(
        profile,
        rest,
        boxOf(columnIndex, height, progress && isPageEmpty()),
        region,
      );
      if (result.placed.length === 0) {
        // Once begun, the unit goes on in the very next column or not here.
        if (first !== undefined) {
          break;
        }
        continue;
      }
      commit(columnIndex, result);
      rest = result.rest;
      first ??= columnIndex;
      last = columnIndex;
      if (result.stop === 'forced-page') {
        pageBreak = true;
        break;
      }
    }
    if (first === undefined) {
      return { rest, placed: false, pageBreak: false };
    }
    // Nothing may come between the pieces: the columns the unit carries on
    // from take nothing more, nor, when it goes on to the next page, does
    // any column after it on this one.
    columns
      .slice(first, rest.length > 0 ? columns.length : last)
      .forEach((column) => {
        column.sealed = true;
      });
    return { rest, placed: true, pageBreak };
  };

  let forcedPage = false;
  // The head carries on at the top of the next page and takes no more here.
  let headWaits = false;
  /** Splits the head as flow does; false when none of it fits. */
  const flowHead = (progress: boolean): boolean => {
    const { rest, placed, pageBreak } = placeFlowing(pending[0], progress);
    if (!placed) {
      return false;
    }
    if (pageBreak) {
      forcedPage = true;
    }
    if (rest.length === 0) {
      pending.shift();
    } else {
      pending[0] = rest;
      headWaits = true;
    }
    return true;
  };

  while (pending.length > 0 && !forcedPage) {
    const head = pending[0];
    const openingBreak = openingBreakOf(head);
    if (openingBreak === 'page' && (!isPageEmpty() || hasContentAbove)) {
      forcedPage = true;
      break;
    }
    if (openingBreak === 'column') {
      // The unit and everything after it go on right of every column with
      // content, or on the next page when no column is left.
      const lastFilled = columns.findLastIndex(
        ({ placed }) => placed.length > 0,
      );
      columns.slice(0, lastFilled + 1).forEach((column) => {
        column.sealed = true;
      });
      pending[0] = [withoutBreak(head[0]), ...head.slice(1)];
      if (columns.every(({ sealed }) => sealed)) {
        break;
      }
      continue;
    }
    if (!headWaits) {
      // A unit begun on the page before goes on at the top of the first
      // column, before anything else, as flow would carry it on.
      if (continuesUnit(head)) {
        if (flowHead(mustProgress)) {
          continue;
        }
        break;
      }
      if (placeWhole(head)) {
        pending.shift();
        continue;
      }
      if ((breaksInside(head) || isOversized(head)) && flowHead(mustProgress)) {
        continue;
      }
    }
    let placedAhead = false;
    for (
      let index = 1;
      index < pending.length && index <= MASONRY_LOOKAHEAD;
      index += 1
    ) {
      if (openingBreakOf(pending[index]) !== undefined) {
        break;
      }
      if (placeWhole(pending[index])) {
        pending.splice(index, 1);
        placedAhead = true;
        break;
      }
    }
    if (!placedAhead) {
      break;
    }
  }

  // Every page takes something: an empty page flows the head from the top.
  if (mustProgress && isPageEmpty() && pending.length > 0 && !forcedPage) {
    flowHead(true);
  }

  return {
    columns: columns.map(({ placed }) => placed),
    used: Math.max(0, ...columns.map(({ bottom }) => bottom)),
    extent: Math.max(
      0,
      ...columns.map(({ bottom, marginBottom }) => bottom + marginBottom),
    ),
    rest: pending.flat(),
    forcedPage,
  };
};

/** The masonry units a page shows, in packed order. */
const packedUnitsOf = (
  items: ReadonlyArray<PageItem>,
  pageIndex: number,
): Array<PackedUnit> =>
  items.flatMap((item) =>
    item.kind !== 'region' || !item.region.masonry
      ? []
      : item.columns.flatMap((column, columnIndex) =>
          column.flatMap(({ block: { stackIndex, unit } }, index) =>
            unit === undefined ||
            column[index - 1]?.block.unit?.index === unit.index
              ? []
              : [{ stackIndex, unit: unit.index, pageIndex, columnIndex }],
          ),
        ),
  );

/** How far into the pieces a fill got: fewer left, or less of the first. */
const consumedAtLeast = (
  result: ColumnsResult,
  target: ColumnsResult,
): boolean =>
  result.rest.length < target.rest.length ||
  (result.rest.length === target.rest.length &&
    (result.rest.length === 0 || result.rest[0].from >= target.rest[0].from));

const resolveColumnFill = (
  profile: FragmentationProfile,
  region: MeasuredRegion,
): 'balance-last' | 'balance-all' | 'sequential' => {
  if (profile.columns.fill !== 'style') {
    return profile.columns.fill;
  }
  return region.fill === 'auto'
    ? 'sequential'
    : region.fill === 'balance-all'
      ? 'balance-all'
      : 'balance-last';
};

/**
 * Fills the columns of a region in the space left on a page and balances
 * them as the profile says: the balanced height is the shortest one that
 * still takes as much as the full height does, found by bisection.
 */
const fillRegion = (
  profile: FragmentationProfile,
  pieces: ReadonlyArray<Piece>,
  region: { stackIndex: number; region: MeasuredRegion },
  available: number,
  atTop: undefined | StartKind,
  mustProgress: boolean,
  spaceAbove: undefined | number,
  context: Omit<PageContext, 'used'>,
): ColumnsResult => {
  const run = (height: number, progress: boolean) =>
    (region.region.masonry ? packMasonry : fillColumns)(
      profile,
      pieces,
      region,
      height,
      atTop,
      progress,
      !mustProgress,
      spaceAbove,
      context,
    );
  const result = run(available, mustProgress);
  const mode = resolveColumnFill(profile, region.region);
  const balance =
    !result.forcedPage &&
    (mode === 'balance-all' ||
      (mode === 'balance-last' && result.rest.length === 0));
  if (!balance || !consumedAtLeast(run(available, false), result)) {
    return result;
  }
  let low = 0;
  let high = available;
  while (high - low > FIT_EPSILON_PX / 2) {
    const middle = (low + high) / 2;
    if (consumedAtLeast(run(middle, false), result)) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return run(high, false);
};

const startKindBefore = (piece: Piece): StartKind =>
  piece.from === 0 && piece.block.breakBefore === 'page' ? 'break' : 'natural';

/**
 * Fills pages with the measured stacks by the profile's rules, and records a
 * checkpoint at the start of every page.
 */
export const placePages = ({
  profile,
  stacks,
  measureStack,
  startPage,
  resumeFrom,
}: PlacementInput): PlacementResult => {
  const measured: Array<undefined | MeasuredStack> = [];
  const measurements: Array<Array<StackMeasurement>> = [];
  /** Stacks whose first block opens with a forced page break. */
  const forcedStarts = new Set<number>();
  const pages: Array<PlacedPage> = [];
  const checkpoints: Array<Checkpoint> = [];
  const packedOrder: Array<PackedUnit> = [];

  let queue: Array<Piece> = [];
  let loadedStackCount = 0;
  let pendingBreak = false;
  let startKind: StartKind = 'stack';
  let pageIndex = 0;

  const piecesOf = (stackIndex: number): Array<Piece> =>
    (measured[stackIndex]?.blocks ?? []).map((block) => ({
      block:
        block.index === 0 && !block.continuation && forcedStarts.has(stackIndex)
          ? { ...block, breakBefore: 'page' }
          : block,
      from: 0,
    }));

  /** Block `index` of the stack's latest measurement, from unit `from` on. */
  const pieceAt = (stackIndex: number, index: number, from: number): Piece => {
    const piece = piecesOf(stackIndex)[index];
    if (!piece) {
      throw new Error('The checkpoint does not match the measured stacks.');
    }
    return { block: piece.block, from };
  };

  const measureInto = (
    stackIndex: number,
    size: BoxSize,
    continuations: ReadonlyArray<Piece>,
  ) => {
    measured[stackIndex] = measureStack(stackIndex, size, continuations);
    (measurements[stackIndex] ??= []).push({
      size,
      continuations: continuations.map(({ block, from }) => ({
        index: block.index,
        from,
      })),
    });
  };

  /** Measures the next stack into the queue at the size of the current page. */
  const loadStack = (size: BoxSize): Array<Piece> => {
    const stackIndex = loadedStackCount;
    measureInto(stackIndex, size, []);
    loadedStackCount += 1;
    const stack = measured[stackIndex];
    if (pendingBreak && stack && stack.blocks.length > 0) {
      forcedStarts.add(stackIndex);
      pendingBreak = false;
    }
    if (stack?.breakAfter === 'page') {
      pendingBreak = true;
    }
    return piecesOf(stackIndex);
  };

  /**
   * Measures again, at the size of this page, every stack with content left
   * that was measured at another width, and every stack whose next piece
   * starts inside a split table row, whose cells each go on from a line of
   * their own. A block split before carries on from the same place in its
   * content, measured on its own as a continuation.
   */
  const remeasureFor = (size: BoxSize) => {
    const stale = new Set(
      queue
        .filter(
          (piece) =>
            Math.abs(
              (measured[piece.block.stackIndex]?.width ?? size.width) -
                size.width,
            ) > FIT_EPSILON_PX || startsInsideSplitRow(piece),
        )
        .map(({ block }) => block.stackIndex),
    );
    for (const stackIndex of stale) {
      measureInto(
        stackIndex,
        size,
        queue.filter(
          (piece) =>
            piece.block.stackIndex === stackIndex && !opensBlock(piece),
        ),
      );
    }
    queue = queue.map((piece) =>
      stale.has(piece.block.stackIndex)
        ? pieceAt(piece.block.stackIndex, piece.block.index, 0)
        : piece,
    );
  };

  const snapshot = (): Checkpoint => ({
    pageIndex,
    queue: queue.map(({ block, from }): PieceRef => ({
      stackIndex: block.stackIndex,
      index: block.index,
      from,
    })),
    loadedStackCount,
    measurements: measurements.map((stackMeasurements) => [
      ...stackMeasurements,
    ]),
    forcedStarts: [...forcedStarts],
    pendingBreak,
    startKind,
    packedCount: (resumeFrom?.packedCount ?? 0) + packedOrder.length,
  });

  if (resumeFrom) {
    pageIndex = resumeFrom.pageIndex;
    loadedStackCount = resumeFrom.loadedStackCount;
    pendingBreak = resumeFrom.pendingBreak;
    startKind = resumeFrom.startKind;
    resumeFrom.forcedStarts.forEach((stackIndex) =>
      forcedStarts.add(stackIndex),
    );
    // The stacks with content left are measured again as they were; the
    // measurements of the others are only carried on.
    const pending = new Set(
      resumeFrom.queue.map(({ stackIndex }) => stackIndex),
    );
    resumeFrom.measurements.forEach((stackMeasurements, stackIndex) => {
      if (!pending.has(stackIndex)) {
        measurements[stackIndex] = [...stackMeasurements];
        return;
      }
      for (const { size, continuations } of stackMeasurements) {
        measureInto(
          stackIndex,
          size,
          continuations.map(({ index, from }) =>
            pieceAt(stackIndex, index, from),
          ),
        );
      }
    });
    queue = resumeFrom.queue.map(({ stackIndex, index, from }) =>
      pieceAt(stackIndex, index, from),
    );
  }

  for (;;) {
    // Who owns the page: the content that starts it, or the next stack.
    let stackIndex: number;
    let first: boolean;
    const head = queue.at(0);
    if (head) {
      stackIndex = head.block.stackIndex;
      first = opensBlock(head) && head.block.index === 0;
    } else if (loadedStackCount < stacks.length) {
      stackIndex = loadedStackCount;
      first = true;
      startKind = 'stack';
      // A stack that starts a page already breaks; a break before it is
      // the same break.
      pendingBreak = false;
    } else if (pendingBreak && pages.length > 0) {
      // A forced break ends the document: Word ends it with a blank page.
      checkpoints.push(snapshot());
      pendingBreak = false;
      const lastStack = pages[pages.length - 1].stackIndex;
      const size = startPage({
        pageIndex,
        stackIndex: lastStack,
        first: false,
      });
      pages.push({
        stackIndex: lastStack,
        first: false,
        startKind: 'break',
        size,
        items: [],
      });
      pageIndex += 1;
      continue;
    } else {
      break;
    }

    checkpoints.push(snapshot());
    const size = startPage({ pageIndex, stackIndex, first });
    if (head) {
      remeasureFor(size);
    } else {
      queue = loadStack(size);
    }

    const items: Array<PageItem> = [];
    let used = 0;
    /**
     * The margin below what was placed last, which is drawn already and which
     * `used` stops above: the bottom margin of a flow block, or those at the
     * bottoms of a region's columns, which stay inside them. The columns are
     * formatting contexts of their own, so what comes next in another one
     * starts below it, and its first block keeps only what is left of its top
     * margin once the two combine by the profile's rule.
     */
    let marginBelow = 0;
    let boxStart: undefined | StartKind = startKind;
    let nextStartKind: undefined | StartKind = undefined;
    const context = (): Omit<PageContext, 'used'> => ({
      pageIndex,
      stackIndex,
      startKind,
      boxHeight: size.height,
      columnIndex: undefined,
    });
    const loadMore = () =>
      loadedStackCount < stacks.length && stacks[loadedStackCount].continuous
        ? loadStack(size)
        : undefined;

    for (;;) {
      if (queue.length === 0) {
        const more = loadMore();
        if (more === undefined) {
          break;
        }
        queue = more;
        continue;
      }
      const mustProgress = items.length === 0;
      const regionBlock = queue[0].block;
      if (regionBlock.region) {
        const region = {
          stackIndex: regionBlock.stackIndex,
          region: regionBlock.region,
        };
        const segmentEnd = queue.findIndex(
          ({ block }) => !sameRegion(block, region),
        );
        const segment = segmentEnd < 0 ? queue : queue.slice(0, segmentEnd);
        const result = fillRegion(
          profile,
          segment,
          region,
          size.height - used - marginBelow,
          boxStart,
          mustProgress,
          mustProgress ? undefined : marginBelow,
          context(),
        );
        if (result.columns.some((column) => column.length > 0)) {
          items.push({
            kind: 'region',
            region: region.region,
            columns: result.columns,
          });
        }
        used += marginBelow + result.used;
        marginBelow = result.extent - result.used;
        queue = [...result.rest, ...queue.slice(segment.length)];
        boxStart = undefined;
        if (result.rest.length > 0 || result.forcedPage) {
          nextStartKind = result.forcedPage ? 'break' : 'natural';
          break;
        }
        continue;
      }

      const result = fill(
        profile,
        queue,
        {
          height: size.height - used - marginBelow,
          atTop: boxStart,
          isColumn: false,
          mustProgress,
          hasContentAbove: !mustProgress,
          spaceAbove: mustProgress ? undefined : marginBelow,
          context: context(),
        },
        undefined,
        loadMore,
      );
      items.push(
        ...result.placed.map((placement): PageItem => ({
          kind: 'flow',
          placement,
        })),
      );
      queue = result.rest;
      if (result.placed.length > 0) {
        used += marginBelow + result.used;
        boxStart = undefined;
        marginBelow = marginBelowOf(result.placed);
      }
      if (result.stop === 'region') {
        continue;
      }
      if (result.stop !== 'end') {
        nextStartKind = queue[0] ? startKindBefore(queue[0]) : 'natural';
      }
      break;
    }

    pages.push({ stackIndex, first, startKind, size, items });
    packedOrder.push(...packedUnitsOf(items, pageIndex));
    pageIndex += 1;
    if (nextStartKind) {
      startKind = nextStartKind;
    }
  }

  return { pages, checkpoints, packedOrder };
};
