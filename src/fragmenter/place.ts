import {
  FIT_EPSILON_PX,
  unitCountOf,
  type BoxSize,
  type Checkpoint,
  type MeasuredBlock,
  type MeasuredRegion,
  type MeasuredStack,
  type PageContext,
  type PageItem,
  type Piece,
  type PieceRef,
  type PlacedPage,
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
  /** Measures a stack at the content size of the page it starts on. */
  measureStack: (stackIndex: number, size: BoxSize) => MeasuredStack;
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

const wantsRepeatedHeader = (
  profile: FragmentationProfile,
  block: MeasuredBlock,
): boolean =>
  block.repeatHeight > 0 &&
  (profile.tables.repeatHeader === 'always' ||
    (profile.tables.repeatHeader === 'option' && block.repeatHeader));

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
  if (best - from < (from === 0 ? orphans : 1)) {
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
  let previousMarginBottom = 0;
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
    const opening = from === 0;
    const marginTop = !opening
      ? 0
      : last
        ? combineMargins(profile, previousMarginBottom, block.marginTop)
        : box.atTop === undefined || profile.margins.keepAtTop[box.atTop]
          ? block.marginTop
          : 0;
    const top = used + marginTop + (opening ? block.insetTop : 0);
    const heightOf = (to: number, repeatHeader: boolean) =>
      splitter.pieceHeight(block, from, to, { repeatHeader }) +
      (to === unitCount ? block.insetBottom : 0);
    const fits = (to: number, repeatHeader: boolean) =>
      top + heightOf(to, repeatHeader) <= box.height + FIT_EPSILON_PX;

    let repeatHeader = !opening && wantsRepeatedHeader(profile, block);
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
      box.height - top,
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
        box.height - top,
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
        candidate.from === 0 && candidate.to === unitCountOf(candidate.block);
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
  rest: Array<Piece>;
  forcedPage: boolean;
};

const fillColumns = (
  profile: FragmentationProfile,
  pieces: ReadonlyArray<Piece>,
  region: { stackIndex: number; region: MeasuredRegion },
  height: number,
  atTop: undefined | StartKind,
  mustProgress: boolean,
  hasContentAbove: boolean,
  context: Omit<PageContext, 'used'>,
): ColumnsResult => {
  const columns: Array<Array<Placement>> = [];
  let rest: Array<Piece> = [...pieces];
  let used = 0;
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
    rest = result.rest;
    if (result.stop === 'forced-page') {
      forcedPage = true;
      break;
    }
  }
  return { columns, used, rest, forcedPage };
};

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
  context: Omit<PageContext, 'used'>,
): ColumnsResult => {
  const run = (height: number, progress: boolean) =>
    fillColumns(
      profile,
      pieces,
      region,
      height,
      atTop,
      progress,
      !mustProgress,
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
  const stackSizes: Array<BoxSize> = [];
  /** Stacks whose first block opens with a forced page break. */
  const forcedStarts = new Set<number>();
  const pages: Array<PlacedPage> = [];
  const checkpoints: Array<Checkpoint> = [];

  let queue: Array<Piece> = [];
  let loadedStackCount = 0;
  let pendingBreak = false;
  let startKind: StartKind = 'stack';
  let pageIndex = 0;

  const piecesOf = (stackIndex: number): Array<Piece> =>
    (measured[stackIndex]?.blocks ?? []).map((block) => ({
      block:
        block.index === 0 && forcedStarts.has(stackIndex)
          ? { ...block, breakBefore: 'page' }
          : block,
      from: 0,
    }));

  const measureInto = (stackIndex: number, size: BoxSize) => {
    measured[stackIndex] = measureStack(stackIndex, size);
    stackSizes[stackIndex] = size;
  };

  /** Measures the next stack into the queue at the size of the current page. */
  const loadStack = (size: BoxSize): Array<Piece> => {
    const stackIndex = loadedStackCount;
    measureInto(stackIndex, size);
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
   * Re-measures every stack that starts on this page at its size, when it was
   * measured at another page's size and nothing of it is placed yet.
   */
  const remeasureFor = (size: BoxSize) => {
    const stale = new Set(
      queue
        .filter(
          ({ block, from }) =>
            block.index === 0 &&
            from === 0 &&
            Math.abs(
              (measured[block.stackIndex]?.width ?? size.width) - size.width,
            ) > FIT_EPSILON_PX,
        )
        .map(({ block }) => block.stackIndex),
    );
    if (stale.size === 0) {
      return;
    }
    queue = queue.flatMap((piece) => {
      const { stackIndex, index } = piece.block;
      if (!stale.has(stackIndex)) {
        return [piece];
      }
      if (index !== 0) {
        return [];
      }
      measureInto(stackIndex, size);
      return piecesOf(stackIndex);
    });
  };

  const snapshot = (): Checkpoint => ({
    pageIndex,
    queue: queue.map(({ block, from }): PieceRef => ({
      stackIndex: block.stackIndex,
      index: block.index,
      from,
    })),
    loadedStackCount,
    stackSizes: [...stackSizes],
    forcedStarts: [...forcedStarts],
    pendingBreak,
    startKind,
  });

  if (resumeFrom) {
    pageIndex = resumeFrom.pageIndex;
    loadedStackCount = resumeFrom.loadedStackCount;
    pendingBreak = resumeFrom.pendingBreak;
    startKind = resumeFrom.startKind;
    resumeFrom.forcedStarts.forEach((stackIndex) =>
      forcedStarts.add(stackIndex),
    );
    resumeFrom.stackSizes.forEach((size, stackIndex) => {
      stackSizes[stackIndex] = size;
    });
    queue = resumeFrom.queue.map(({ stackIndex, index, from }) => {
      if (!measured[stackIndex]) {
        measureInto(stackIndex, resumeFrom.stackSizes[stackIndex]);
      }
      const piece = piecesOf(stackIndex)[index];
      if (!piece) {
        throw new Error('The checkpoint does not match the measured stacks.');
      }
      return { block: piece.block, from };
    });
  }

  for (;;) {
    // Who owns the page: the content that starts it, or the next stack.
    let stackIndex: number;
    let first: boolean;
    const head = queue.at(0);
    if (head) {
      stackIndex = head.block.stackIndex;
      first = head.from === 0 && head.block.index === 0;
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
          size.height - used,
          boxStart,
          mustProgress,
          context(),
        );
        if (result.columns.some((column) => column.length > 0)) {
          items.push({
            kind: 'region',
            region: region.region,
            columns: result.columns,
          });
        }
        used += result.used;
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
          height: size.height - used,
          atTop: boxStart,
          isColumn: false,
          mustProgress,
          hasContentAbove: !mustProgress,
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
      used += result.used;
      queue = result.rest;
      if (result.placed.length > 0) {
        boxStart = undefined;
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
    pageIndex += 1;
    if (nextStartKind) {
      startKind = nextStartKind;
    }
  }

  return { pages, checkpoints };
};
