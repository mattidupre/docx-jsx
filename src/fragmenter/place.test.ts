import { describe, expect, test } from 'vitest';
import type { FragmentationOption } from '../entities';
import {
  unitCountOf,
  type BoundaryKind,
  type BoxSize,
  type Checkpoint,
  type MeasuredBlock,
  type MeasuredRegion,
  type MeasuredStack,
  type PlacedPage,
  type SplitRow,
} from './model';
import { MASONRY_LOOKAHEAD, placePages, type PlacementInput } from './place';
import type { FragmentationProfile } from './profile';
import { resolveFragmentationProfile } from './profiles';

/**
 * The placement core on synthetic measured models: no DOM, only the numbers a
 * measurement would produce. Every text line is `LINE` px tall.
 */
const LINE = 10;

type BlockSpec = Partial<Omit<MeasuredBlock, 'stackIndex' | 'index'>>;

/** A paragraph of `lines` lines. */
const text = (lines: number, spec: BlockSpec = {}): BlockSpec => ({
  kind: 'text',
  height: lines * LINE,
  bounds: Array.from({ length: lines + 1 }, (_value, index) => index * LINE),
  boundaries: Array.from(
    { length: lines + 1 },
    (_value, index): BoundaryKind =>
      index === 0 || index === lines ? 'edge' : 'line',
  ),
  ...spec,
});

/** A block that only moves whole. */
const atomic = (height: number, spec: BlockSpec = {}): BlockSpec => ({
  kind: 'atomic',
  height,
  bounds: [0, height],
  boundaries: ['edge', 'edge'],
  ...spec,
});

/**
 * A table with a `header` px header and one unit per entry of `rows`: a
 * number is a whole row that tall, an array a row cut into slices.
 */
const table = (
  header: number,
  rows: ReadonlyArray<
    number | { slices: ReadonlyArray<number>; kept: boolean }
  >,
  spec: BlockSpec = {},
): BlockSpec => {
  const bounds: Array<number> = [];
  const boundaries: Array<BoundaryKind> = [];
  let top = header;
  rows.forEach((row, rowIndex) => {
    const slices = typeof row === 'number' ? [row] : row.slices;
    slices.forEach((slice, sliceIndex) => {
      bounds.push(top);
      boundaries.push(
        sliceIndex > 0
          ? typeof row !== 'number' && row.kept
            ? 'within-kept-row'
            : 'within-row'
          : rowIndex === 0
            ? 'edge'
            : 'row',
      );
      top += slice;
    });
  });
  bounds.push(top);
  boundaries.push('edge');
  return {
    kind: 'table',
    height: top,
    bounds,
    boundaries,
    repeatHeight: header,
    repeatHeader: true,
    ...spec,
  };
};

const toBlock = (
  spec: BlockSpec,
  stackIndex: number,
  index: number,
): MeasuredBlock => ({
  kind: 'text',
  measurement: 0,
  continuation: false,
  region: undefined,
  unit: undefined,
  height: 0,
  marginTop: 0,
  insetTop: 0,
  marginBottom: 0,
  insetBottom: 0,
  bounds: [0, 0],
  boundaries: ['edge', 'edge'],
  splitRows: [],
  repeatHeight: 0,
  repeatHeader: false,
  keepLines: false,
  keepNext: false,
  keepPrevious: false,
  breakBefore: undefined,
  orphans: 2,
  widows: 2,
  trim: undefined,
  ...spec,
  stackIndex,
  index,
});

/**
 * What is left of a block from unit `from` on, measured again on its own: the
 * units after `from`, opening as a continuation does.
 */
const restOf = (block: MeasuredBlock, from: number): BlockSpec => ({
  ...block,
  marginTop: 0,
  insetTop: 0,
  keepPrevious: false,
  breakBefore: undefined,
  unit: block.unit && { index: block.unit.index, opens: false },
  height: block.height - block.bounds[from],
  bounds: block.bounds.slice(from).map((bound) => bound - block.bounds[from]),
  boundaries: ['edge', ...block.boundaries.slice(from + 1)],
});

type StackSpec = {
  blocks: ReadonlyArray<BlockSpec>;
  /** The blocks at a width, when they depend on it; `blocks` otherwise. */
  blocksAt?: (width: number) => ReadonlyArray<BlockSpec>;
  /**
   * What is left of a block from a unit on, at a width, when the block was
   * measured at `previousWidth`; {@link restOf} otherwise.
   */
  restAt?: (
    block: MeasuredBlock,
    from: number,
    widths: { width: number; previousWidth: number },
  ) => BlockSpec;
  continuous?: boolean;
  breakAfter?: 'page';
  /** The content size of the pages the stack owns. */
  size?: BoxSize;
  /** The content size of those it owns but does not start, if another. */
  subsequentSize?: BoxSize;
};

type RunOptions = {
  profile?: FragmentationOption | FragmentationProfile;
  height?: number;
  resumeFrom?: PlacementInput['resumeFrom'];
};

const run = (stacks: ReadonlyArray<StackSpec>, options: RunOptions = {}) => {
  const measured: Array<{ stackIndex: number; size: BoxSize }> = [];
  const starts: Array<{
    pageIndex: number;
    stackIndex: number;
    first: boolean;
  }> = [];
  const defaultSize = { width: 500, height: options.height ?? 100 };
  /** The width of every measurement of each stack. */
  const widths: Array<Array<number>> = [];
  const result = placePages({
    profile: resolveFragmentationProfile(options.profile),
    stacks: stacks.map(({ continuous = false }) => ({ continuous })),
    measureStack: (stackIndex, size, continuations): MeasuredStack => {
      measured.push({ stackIndex, size });
      const stackWidths = (widths[stackIndex] ??= []);
      const measurement = stackWidths.length;
      const previousWidth = stackWidths.at(-1) ?? size.width;
      stackWidths.push(size.width);
      const stack = stacks[stackIndex];
      const specs = stack.blocksAt?.(size.width) ?? stack.blocks;
      return {
        width: size.width,
        blocks: specs.map((spec, index) => {
          const piece = continuations.find(
            ({ block }) => block.index === index,
          );
          const rest =
            piece &&
            (stack.restAt?.(piece.block, piece.from, {
              width: size.width,
              previousWidth,
            }) ??
              restOf(piece.block, piece.from));
          return toBlock(
            {
              ...(rest ?? spec),
              measurement,
              continuation: rest !== undefined,
            },
            stackIndex,
            index,
          );
        }),
        breakAfter: stack.breakAfter,
      };
    },
    startPage: (context) => {
      starts.push(context);
      const stack = stacks[context.stackIndex];
      return (
        (!context.first && stack.subsequentSize) || stack.size || defaultSize
      );
    },
    resumeFrom: options.resumeFrom,
  });
  return { ...result, measured, starts };
};

/** Every page as `stack.block[from-to]` for each placement. */
const describePages = (pages: ReadonlyArray<PlacedPage>) =>
  pages.map((page) =>
    page.items.flatMap((item) =>
      item.kind === 'flow'
        ? [
            `${item.placement.block.stackIndex}.${item.placement.block.index}[${item.placement.from}-${item.placement.to}]`,
          ]
        : [
            item.columns.map((column) =>
              column
                .map(
                  ({ block, from, to }) =>
                    `${block.stackIndex}.${block.index}[${from}-${to}]`,
                )
                .join(' '),
            ),
          ].map((columns) => `columns(${columns.join(' | ')})`),
    ),
  );

const flowPlacements = (page: PlacedPage) =>
  page.items.flatMap((item) => (item.kind === 'flow' ? [item.placement] : []));

describe('widows and orphans', () => {
  test('moves a paragraph whole rather than leave one line at the top of the next page', () => {
    const { pages } = run([{ blocks: [atomic(80), text(3)] }]);
    expect(describePages(pages)).toEqual([['0.0[0-1]'], ['0.1[0-3]']]);
  });

  test('moves a paragraph whole rather than leave one line at the bottom of a page', () => {
    const { pages } = run([{ blocks: [atomic(90), text(3)] }]);
    expect(describePages(pages)).toEqual([['0.0[0-1]'], ['0.1[0-3]']]);
  });

  test('carries two lines when only one would be left', () => {
    // Four of the five lines fit; the break moves back one line.
    const { pages } = run([{ blocks: [atomic(60), text(5)] }]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]', '0.1[0-3]'],
      ['0.1[3-5]'],
    ]);
  });

  test('ignores the computed widows and orphans under the word profile', () => {
    const { pages } = run([
      { blocks: [atomic(90), text(3, { widows: 1, orphans: 1 })] },
    ]);
    expect(describePages(pages)).toEqual([['0.0[0-1]'], ['0.1[0-3]']]);
  });

  test('honours the computed widows and orphans under the css profile', () => {
    const { pages } = run(
      [{ blocks: [atomic(90), text(3, { widows: 1, orphans: 1 })] }],
      { profile: 'css' },
    );
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]', '0.1[0-1]'],
      ['0.1[1-3]'],
    ]);
  });

  test('fails open when a paragraph is alone on a page', () => {
    // Twelve lines kept together cannot fit any page, so they split anyway.
    const { pages } = run([{ blocks: [text(12, { keepLines: true })] }]);
    expect(describePages(pages)).toEqual([['0.0[0-10]'], ['0.0[10-12]']]);
  });
});

describe('keep with next', () => {
  test('moves a heading with the paragraph that does not fit under it', () => {
    const { pages } = run([
      { blocks: [atomic(70), atomic(10, { keepNext: true }), text(3)] },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]', '0.2[0-3]'],
    ]);
  });

  test('keeps a heading with the first lines of a paragraph that splits', () => {
    const { pages } = run([
      { blocks: [atomic(50), atomic(10, { keepNext: true }), text(6)] },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]', '0.1[0-1]', '0.2[0-4]'],
      ['0.2[4-6]'],
    ]);
  });

  test('moves a whole chain', () => {
    const { pages } = run([
      {
        blocks: [
          atomic(60),
          atomic(10, { keepNext: true }),
          atomic(10, { keepNext: true }),
          atomic(30),
        ],
      },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]', '0.2[0-1]', '0.3[0-1]'],
    ]);
  });

  test('abandons a chain that starts the page', () => {
    const { pages } = run([
      {
        blocks: [
          atomic(50, { keepNext: true }),
          atomic(40, { keepNext: true }),
          atomic(30),
        ],
      },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]', '0.1[0-1]'],
      ['0.2[0-1]'],
    ]);
  });

  test('reaches across the boundary into a continuous stack', () => {
    const { pages } = run([
      { blocks: [atomic(80), atomic(10, { keepNext: true })] },
      { blocks: [atomic(30)], continuous: true },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]', '1.0[0-1]'],
    ]);
  });

  test('treats break-before: avoid and a vetoing hook as keeps', () => {
    const blocks = [atomic(80), atomic(10), atomic(30)];
    const avoided = run([
      { blocks: [blocks[0], blocks[1], { ...blocks[2], keepPrevious: true }] },
    ]);
    expect(describePages(avoided.pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]', '0.2[0-1]'],
    ]);

    const vetoing: FragmentationProfile = {
      ...resolveFragmentationProfile('word'),
      canBreakBetween: (before) => before.index !== 1,
    };
    const vetoed = run([{ blocks }], { profile: vetoing });
    expect(describePages(vetoed.pages)).toEqual(describePages(avoided.pages));
  });

  test('lets adjustBreak move a break earlier', () => {
    const adjusting: FragmentationProfile = {
      ...resolveFragmentationProfile('word'),
      adjustBreak: ({ from, to }) => (from === 0 ? 2 : to),
    };
    const { pages } = run([{ blocks: [text(15)] }], { profile: adjusting });
    expect(describePages(pages)).toEqual([
      ['0.0[0-2]'],
      ['0.0[2-12]'],
      ['0.0[12-15]'],
    ]);
  });
});

describe('forced breaks and stacks', () => {
  test('starts a page at a forced break and at every stack that is not continuous', () => {
    const { pages, starts } = run([
      { blocks: [atomic(10), atomic(10, { breakBefore: 'page' })] },
      { blocks: [atomic(10)] },
      { blocks: [atomic(10)], continuous: true },
    ]);
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]'],
      ['1.0[0-1]', '2.0[0-1]'],
    ]);
    expect(starts).toEqual([
      { pageIndex: 0, stackIndex: 0, first: true },
      { pageIndex: 1, stackIndex: 0, first: false },
      { pageIndex: 2, stackIndex: 1, first: true },
    ]);
    expect(pages.map(({ startKind }) => startKind)).toEqual([
      'stack',
      'break',
      'stack',
    ]);
  });

  test('applies a break at the end of a stack to the next one', () => {
    const { pages } = run([
      { blocks: [atomic(10)], breakAfter: 'page' },
      { blocks: [atomic(10)], continuous: true },
    ]);
    expect(describePages(pages)).toEqual([['0.0[0-1]'], ['1.0[0-1]']]);
    expect(pages[1]).toMatchObject({ first: true, startKind: 'break' });
  });

  test('ends a document with a blank page after a trailing break', () => {
    const { pages } = run([{ blocks: [atomic(10)], breakAfter: 'page' }]);
    expect(describePages(pages)).toEqual([['0.0[0-1]'], []]);
    expect(pages[1]).toMatchObject({ stackIndex: 0, first: false });
  });

  test('gives a continuous stack its first layout when it starts a page', () => {
    const { starts } = run([
      { blocks: [atomic(90)] },
      { blocks: [atomic(30)], continuous: true },
    ]);
    expect(starts.at(-1)).toEqual({ pageIndex: 1, stackIndex: 1, first: true });
  });

  test('measures every stack at the size of the page it starts on', () => {
    const wide = { width: 600, height: 100 };
    const narrow = { width: 300, height: 100 };
    const { measured } = run([
      { blocks: [atomic(90)], size: wide },
      // Measured on stack 0's page, then again on its own when it moves.
      { blocks: [atomic(30)], continuous: true, size: narrow },
      { blocks: [atomic(10)], size: narrow },
    ]);
    expect(measured).toEqual([
      { stackIndex: 0, size: wide },
      { stackIndex: 1, size: wide },
      { stackIndex: 1, size: narrow },
      { stackIndex: 2, size: narrow },
    ]);
  });
});

describe('pages of another width', () => {
  /**
   * A paragraph of `chars` characters of 10px, in lines of `LINE` px, wrapped
   * at the width it is measured at. What is left of it after a split is the
   * characters after its first `from` lines there, wrapped again.
   */
  const prose = (chars: number): Pick<StackSpec, 'blocksAt' | 'restAt'> => {
    let left = chars;
    const linesOf = (count: number, width: number) =>
      text(Math.ceil((count * 10) / width));
    return {
      blocksAt: (width) => {
        left = chars;
        return [linesOf(chars, width)];
      },
      restAt: (_block, from, { width, previousWidth }) => {
        left -= (from * previousWidth) / 10;
        return linesOf(left, width);
      },
    };
  };

  test('measures what is left of a stack again at the width of a later page', () => {
    const wide = { width: 500, height: 40 };
    const narrow = { width: 250, height: 40 };
    const { pages, measured } = run([
      { blocks: [], ...prose(300), size: wide, subsequentSize: narrow },
    ]);
    // Six lines of 50 characters: four fit. The last 100 characters wrap to
    // four lines of 25 on the narrower page, not two.
    expect(describePages(pages)).toEqual([['0.0[0-4]'], ['0.0[0-4]']]);
    expect(measured.map(({ size }) => size)).toEqual([wide, narrow]);
    const [continuation] = flowPlacements(pages[1]);
    expect(continuation.block).toMatchObject({
      measurement: 1,
      continuation: true,
    });
    // A continuation opens with no space of its own.
    expect(continuation.marginTop).toBe(0);
  });

  test('measures a continuous stack again on the page of its own it goes on to', () => {
    const wide = { width: 500, height: 40 };
    const narrow = { width: 250, height: 40 };
    const { pages, starts } = run([
      { blocks: [atomic(20)], size: wide },
      { blocks: [], ...prose(300), continuous: true, size: narrow },
    ]);
    // Two of its six 50 character lines fit below stack 0; the other 200
    // characters are eight lines of 25 on its own pages.
    expect(describePages(pages)).toEqual([
      ['0.0[0-1]', '1.0[0-2]'],
      ['1.0[0-4]'],
      ['1.0[4-8]'],
    ]);
    expect(starts.slice(1)).toEqual([
      { pageIndex: 1, stackIndex: 1, first: false },
      { pageIndex: 2, stackIndex: 1, first: false },
    ]);
  });

  test('resumes from a checkpoint after a measurement at another width', () => {
    const stacks: Array<StackSpec> = [
      {
        blocks: [],
        ...prose(1000),
        size: { width: 500, height: 40 },
        subsequentSize: { width: 250, height: 40 },
      },
    ];
    const full = run(stacks);
    const serialized: ReadonlyArray<Checkpoint> = JSON.parse(
      JSON.stringify(full.checkpoints),
    );
    for (let pageIndex = 1; pageIndex < full.pages.length; pageIndex += 1) {
      const resumed = run(stacks, { resumeFrom: serialized[pageIndex] });
      expect(describePages(resumed.pages)).toEqual(
        describePages(full.pages.slice(pageIndex)),
      );
    }
  });
});

describe('margins', () => {
  const marginTopsOf = (pages: ReadonlyArray<PlacedPage>) =>
    pages.map((page) => flowPlacements(page).map(({ marginTop }) => marginTop));

  test('collapses adjacent margins to the larger one', () => {
    const { pages } = run([
      {
        blocks: [
          atomic(10, { marginBottom: 12 }),
          atomic(10, { marginTop: 6, marginBottom: 24 }),
          atomic(10, { marginTop: 6 }),
        ],
      },
    ]);
    expect(marginTopsOf(pages)).toEqual([[0, 12, 24]]);
  });

  test('truncates space-before by how the page started, per profile', () => {
    const stacks = [
      {
        blocks: [
          // Stack start.
          atomic(10, { marginTop: 5 }),
          // Forced break.
          atomic(10, { marginTop: 5, breakBefore: 'page' }),
          atomic(80),
          // Natural break.
          atomic(20, { marginTop: 5 }),
        ],
      },
    ];
    expect(marginTopsOf(run(stacks).pages)).toEqual([[5], [0, 0], [0]]);
    expect(marginTopsOf(run(stacks, { profile: 'css' }).pages)).toEqual([
      [5],
      [5, 0],
      [0],
    ]);
  });

  test('truncates space-before at the top of a column under both profiles', () => {
    const region: MeasuredRegion = {
      id: 0,
      columnCount: 2,
      columnGap: 10,
      fill: 'auto',
      masonry: undefined,
    };
    const blocks = Array.from({ length: 12 }, () =>
      atomic(10, { marginTop: 5, region }),
    );
    for (const profile of ['word', 'css'] as const) {
      const [page] = run([{ blocks }], { profile }).pages;
      const [item] = page.items;
      if (item.kind !== 'region') {
        throw new Error('Expected a region.');
      }
      expect(item.columns[0][0].marginTop).toBe(5);
      expect(item.columns[1][0].marginTop).toBe(0);
    }
  });

  test('can express native ODF: margins added, space-before kept at the top', () => {
    const odf: FragmentationOption = {
      margins: {
        adjacent: 'sum',
        keepAtTop: { stack: true, break: true, natural: true, column: true },
      },
    };
    const { pages } = run(
      [
        {
          blocks: [
            atomic(40, { marginBottom: 10 }),
            atomic(40, { marginTop: 10 }),
            atomic(10, { marginTop: 10 }),
          ],
        },
      ],
      { profile: odf },
    );
    // 40 + (10 + 10) + 40 fills 100; the third keeps its margin on page two.
    expect(marginTopsOf(pages)).toEqual([[0, 20], [10]]);
  });
});

describe('trimmed text', () => {
  // A 15pt line with capitals 7.5pt tall: Word draws the capitals of an
  // exact line 0.8 × 15 + 0.25 − 7.5 = 4.75pt (19/3 px) below its top and
  // keeps 0.2 × 15 − 0.25 = 2.75pt (11/3 px) below its baseline.
  const TRIM = { lineHeight: 20, capHeight: 10 };
  const INSET = 19 / 3;

  /** A trimmed paragraph of `lines` lines: its bounds are its baselines. */
  const trimmed = (lines: number, spec: BlockSpec = {}): BlockSpec => {
    const height = (lines - 1) * TRIM.lineHeight + TRIM.capHeight;
    return {
      kind: 'text',
      height,
      bounds: [
        0,
        ...Array.from(
          { length: lines - 1 },
          (_value, index) => TRIM.capHeight + index * TRIM.lineHeight,
        ),
        height,
      ],
      boundaries: Array.from(
        { length: lines + 1 },
        (_value, index): BoundaryKind =>
          index === 0 || index === lines ? 'edge' : 'line',
      ),
      trim: TRIM,
      ...spec,
    };
  };

  const firstMarginTops = (pages: ReadonlyArray<PlacedPage>) =>
    pages.map((page) => flowPlacements(page)[0]?.marginTop);

  test('insets a first line at the top of a page where Word draws it', () => {
    const stacks = [{ blocks: [trimmed(2), atomic(30), trimmed(1)] }];
    const word = run(stacks).pages;
    expect(firstMarginTops(word)[0]).toBeCloseTo(INSET);
    // Part way down the page, the margin alone places it.
    expect(flowPlacements(word[0])[2].marginTop).toBe(0);
    expect(firstMarginTops(run(stacks, { profile: 'css' }).pages)).toEqual([0]);
  });

  test('counts a margin kept at the top towards the inset', () => {
    expect(
      firstMarginTops(run([{ blocks: [trimmed(1, { marginTop: 4 })] }]).pages),
    ).toEqual([INSET]);
    expect(
      firstMarginTops(run([{ blocks: [trimmed(1, { marginTop: 12 })] }]).pages),
    ).toEqual([12]);
  });

  test('insets the continuation of a paragraph on the next page', () => {
    const stacks = [{ blocks: [atomic(40), trimmed(5)] }];
    const word = run(stacks).pages;
    expect(describePages(word)).toEqual([
      ['0.0[0-1]', '0.1[0-3]'],
      ['0.1[3-5]'],
    ]);
    expect(firstMarginTops(word)[1]).toBeCloseTo(INSET);
    expect(firstMarginTops(run(stacks, { profile: 'css' }).pages)[1]).toBe(0);
  });

  test('measures a continuation from the capitals of its first line', () => {
    const stacks = [{ blocks: [atomic(40), trimmed(5)] }];
    const [, second] = run(stacks, { profile: 'css' }).pages;
    // Two lines trimmed: one line height and a cap height.
    expect(flowPlacements(second)[0].bottom).toBe(30);
  });

  test("keeps room below a last baseline for the rest of Word's line", () => {
    // 88 + 10 fits a 100px page, 88 + 10 + 11/3 does not.
    const stacks = [{ blocks: [atomic(88), trimmed(1)] }];
    expect(describePages(run(stacks).pages)).toEqual([
      ['0.0[0-1]'],
      ['0.1[0-1]'],
    ]);
    expect(describePages(run(stacks, { profile: 'css' }).pages)).toEqual([
      ['0.0[0-1]', '0.1[0-1]'],
    ]);
  });

  test('can turn either rule off', () => {
    const stacks = [{ blocks: [atomic(88), trimmed(1)] }];
    expect(
      describePages(
        run(stacks, { profile: { trim: { reserveAtBottom: false } } }).pages,
      ),
    ).toEqual([['0.0[0-1]', '0.1[0-1]']]);
    expect(
      firstMarginTops(
        run([{ blocks: [trimmed(1)] }], {
          profile: { trim: { insetAtTop: false } },
        }).pages,
      ),
    ).toEqual([0]);
  });
});

describe('tables', () => {
  test('repeats the header on every continuation', () => {
    const { pages } = run([{ blocks: [table(15, Array(12).fill(10))] }]);
    expect(describePages(pages)).toEqual([['0.0[0-8]'], ['0.0[8-12]']]);
    const [continuation] = flowPlacements(pages[1]);
    expect(continuation.repeatHeader).toBe(true);
    expect(continuation.bottom).toBe(15 + 40);
  });

  test('repeats no header under the css profile, or when the table says not to', () => {
    for (const [profile, repeatHeader] of [
      ['css', true],
      ['word', false],
    ] as const) {
      const { pages } = run(
        [{ blocks: [table(15, Array(12).fill(10), { repeatHeader })] }],
        { profile },
      );
      const [continuation] = flowPlacements(pages[1]);
      expect(continuation.repeatHeader).toBe(false);
      expect(continuation.bottom).toBe(40);
    }
  });

  test('drops a repeated header when no row fits under it', () => {
    const { pages } = run([{ blocks: [table(15, [10, 10, 10])] }], {
      height: 20,
    });
    // Page one overflows with the header and the first row; after that the
    // header would leave no room for a row.
    const continuations = pages.slice(1).flatMap(flowPlacements);
    expect(continuations.length).toBeGreaterThan(0);
    for (const placement of continuations) {
      expect(placement.repeatHeader).toBe(false);
    }
  });

  test('splits inside a row that may split under word, and only between rows under css', () => {
    const rows = [50, { slices: [20, 20, 20], kept: false }];
    expect(describePages(run([{ blocks: [table(0, rows)] }]).pages)).toEqual([
      ['0.0[0-3]'],
      ['0.0[3-4]'],
    ]);
    expect(
      describePages(
        run([{ blocks: [table(0, rows)] }], { profile: 'css' }).pages,
      ),
    ).toEqual([['0.0[0-1]'], ['0.0[1-4]']]);
  });

  test('splits a kept row that is taller than a page', () => {
    const rows = [{ slices: [40, 40, 40], kept: true }];
    expect(describePages(run([{ blocks: [table(0, rows)] }]).pages)).toEqual([
      ['0.0[0-2]'],
      ['0.0[2-3]'],
    ]);
  });

  test('splits the cells of a tall row each at its own lines', () => {
    type Cell = SplitRow['cells'][number];
    /** A cell of lines of these heights, from the top of the row. */
    const cellOf = (heights: ReadonlyArray<number>): Cell => {
      let top = 0;
      const lines = heights.map((height) => {
        const line = { top, bottom: top + height };
        top += height;
        return line;
      });
      return { lines, insetTop: 0, insetBottom: 0, bottom: top };
    };
    /**
     * A table of one row of these cells, cut after every line bottom of any
     * cell but the row's end, as the measurement cuts it.
     */
    const rowTable = (cells: ReadonlyArray<Cell>): BlockSpec => {
      const height = Math.max(...cells.map(({ bottom }) => bottom));
      const offsets = [
        ...new Set(
          cells.flatMap(({ lines }) => lines.map(({ bottom }) => bottom)),
        ),
      ]
        .sort((a, b) => a - b)
        .filter((offset) => offset < height);
      return {
        kind: 'table',
        height,
        bounds: [0, ...offsets, height],
        boundaries: [
          'edge',
          ...offsets.map((): BoundaryKind => 'within-kept-row'),
          'edge',
        ],
        splitRows: [
          {
            unit: 0,
            height,
            cells,
            cuts: offsets.map((offset) =>
              cells.map(
                ({ lines }) =>
                  lines.filter(({ bottom }) => bottom <= offset).length,
              ),
            ),
          },
        ],
      };
    };
    // Cell A has ten 10px lines, cell B five 15px lines.
    const heights = [Array(10).fill(10), Array(5).fill(15)];
    const table = rowTable(heights.map(cellOf));
    const { pages, measured } = run(
      [
        {
          blocks: [table],
          // What is left of the row starts each cell at its next line.
          restAt: (block, from) => {
            const cut = block.splitRows[0].cuts[from - 1];
            return rowTable(
              block.splitRows[0].cells.map(({ lines }, cellIndex) =>
                cellOf(
                  lines
                    .slice(cut[cellIndex])
                    .map(({ top, bottom }) => bottom - top),
                ),
              ),
            );
          },
        },
      ],
      { height: 42 },
    );

    // Each page holds as many lines of each cell as fit, and is as tall as
    // its tallest cell: four of A and two of B, twice, then the last two of
    // A and the last of B.
    const pieces = pages.map((page) => flowPlacements(page)[0]);
    expect(pieces.map(({ bottom }) => bottom)).toEqual([40, 40, 20]);
    expect(
      pieces.map(({ block, to }) => block.splitRows[0].cuts[to - 1]),
    ).toEqual([[4, 2], [4, 2], undefined]);
    // The row is measured again on every page it carries on to.
    expect(measured).toHaveLength(3);
  });
});

describe('columns', () => {
  const regionOf = (fill: MeasuredRegion['fill']): MeasuredRegion => ({
    id: 0,
    columnCount: 2,
    columnGap: 10,
    fill,
    masonry: undefined,
  });
  const lines = (count: number, region: undefined | MeasuredRegion) =>
    Array.from({ length: count }, () => atomic(10, { region }));

  test('balances the last page', () => {
    const { pages } = run([{ blocks: lines(10, regionOf('balance')) }]);
    expect(describePages(pages)).toEqual([
      [
        'columns(0.0[0-1] 0.1[0-1] 0.2[0-1] 0.3[0-1] 0.4[0-1] | 0.5[0-1] 0.6[0-1] 0.7[0-1] 0.8[0-1] 0.9[0-1])',
      ],
    ]);
  });

  test('fills columns one after another before the last page', () => {
    const { pages } = run([{ blocks: lines(30, regionOf('balance')) }]);
    const columnSizes = pages.map((page) =>
      page.items.flatMap((item) =>
        item.kind === 'region'
          ? item.columns.map((column) => column.length)
          : [],
      ),
    );
    expect(columnSizes).toEqual([
      [10, 10],
      [5, 5],
    ]);
  });

  test('follows column-fill under the css profile', () => {
    const sequential = run([{ blocks: lines(10, regionOf('auto')) }], {
      profile: 'css',
    });
    const [item] = sequential.pages[0].items;
    expect(item.kind === 'region' && item.columns.map((c) => c.length)).toEqual(
      [10],
    );
    // Word balances whatever the style says.
    const balanced = run([{ blocks: lines(10, regionOf('auto')) }]);
    const [wordItem] = balanced.pages[0].items;
    expect(
      wordItem.kind === 'region' && wordItem.columns.map((c) => c.length),
    ).toEqual([5, 5]);
  });

  test('starts a new column at a column break', () => {
    const region = regionOf('balance');
    const blocks = [
      atomic(10, { region }),
      atomic(10, { region, breakBefore: 'column' }),
    ];
    const [item] = run([{ blocks }]).pages[0].items;
    expect(item.kind === 'region' && item.columns.map((c) => c.length)).toEqual(
      [1, 1],
    );
  });

  test('keeps the margin between flow and columns, which the columns draw inside', () => {
    // A 20px block with a 30px margin leaves 50px: five lines per column.
    const above = run([
      { blocks: [atomic(20, { marginBottom: 30 })] },
      { blocks: lines(12, regionOf('auto')), continuous: true },
    ]);
    const [, region] = above.pages[0].items;
    expect(
      region.kind === 'region' && region.columns.map((c) => c.length),
    ).toEqual([5, 5]);

    // Columns of three lines with a 30px margin under the last leave 40px.
    const below = run([
      {
        blocks: [
          ...lines(5, regionOf('balance')),
          atomic(10, { region: regionOf('balance'), marginBottom: 30 }),
        ],
      },
      { blocks: lines(5, undefined), continuous: true },
    ]);
    expect(describePages(below.pages)[0].slice(1)).toEqual([
      '1.0[0-1]',
      '1.1[0-1]',
      '1.2[0-1]',
      '1.3[0-1]',
    ]);
  });

  test('combines the margins between flow and columns by the profile rule', () => {
    const SUM: FragmentationOption = { margins: { adjacent: 'sum' } };
    // 30px under the flow block, 40px over the first line of the columns.
    const stacksAbove = [
      { blocks: [atomic(20, { marginBottom: 30 })] },
      {
        blocks: [
          atomic(10, { region: regionOf('auto'), marginTop: 40 }),
          // More than the page holds, so the columns are not balanced.
          ...lines(12, regionOf('auto')),
        ],
        continuous: true,
      },
    ];
    const firstInColumns = (option?: FragmentationOption) => {
      const [, region] = run(stacksAbove, { profile: option }).pages[0].items;
      return region.kind === 'region' ? region.columns[0][0] : undefined;
    };
    // The columns start below the flow block's 30px margin, and the first
    // line keeps what is left of the combined margin: 40 − 30 when they
    // collapse, all 40 when they add up.
    expect(firstInColumns()).toMatchObject({ marginTop: 10, bottom: 20 });
    expect(firstInColumns(SUM)).toMatchObject({ marginTop: 40, bottom: 50 });

    // 30px under the columns, 40px over the flow block after them.
    const stacksBelow = [
      {
        blocks: [atomic(10, { region: regionOf('auto'), marginBottom: 30 })],
      },
      { blocks: [atomic(10, { marginTop: 40 })], continuous: true },
    ];
    const flowAfter = (option?: FragmentationOption) =>
      flowPlacements(run(stacksBelow, { profile: option }).pages[0])[0];
    // Its box starts below the columns' margin, as theirs below the flow's.
    expect(flowAfter()).toMatchObject({ marginTop: 10, bottom: 20 });
    expect(flowAfter(SUM)).toMatchObject({ marginTop: 40, bottom: 50 });
  });
});

describe('progress', () => {
  /** A deterministic pseudo-random sequence. */
  const random = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  test('every page consumes at least one unit, and every unit is placed once', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const next = random(seed);
      const blocks: Array<BlockSpec> = Array.from({ length: 30 }, () => {
        const pick = next();
        const flags: BlockSpec = {
          keepNext: next() < 0.4,
          keepLines: next() < 0.2,
          marginTop: Math.floor(next() * 30),
          marginBottom: Math.floor(next() * 30),
        };
        if (pick < 0.3) {
          return atomic(Math.floor(next() * 250) + 1, flags);
        }
        if (pick < 0.5) {
          return table(
            Math.floor(next() * 150),
            Array.from({ length: Math.floor(next() * 12) + 1 }, () =>
              next() < 0.3
                ? { slices: [60, 60, 60], kept: next() < 0.5 }
                : Math.floor(next() * 60) + 1,
            ),
            flags,
          );
        }
        return text(Math.floor(next() * 30) + 1, flags);
      });
      for (const profile of ['word', 'css'] as const) {
        const { pages } = run([{ blocks }], { profile });
        const units: Array<string> = [];
        for (const page of pages) {
          const placements = flowPlacements(page);
          expect(placements.length).toBeGreaterThan(0);
          for (const { block, from, to } of placements) {
            expect(to).toBeGreaterThan(from);
            for (let unit = from; unit < to; unit += 1) {
              units.push(`${block.index}:${unit}`);
            }
          }
        }
        expect(units).toEqual(
          blocks.flatMap((spec, index) =>
            Array.from(
              { length: unitCountOf(toBlock(spec, 0, index)) },
              (_value, unit) => `${index}:${unit}`,
            ),
          ),
        );
      }
    }
  });
});

describe('checkpoints', () => {
  test('resuming from a page makes the same pages from there on', () => {
    const stacks: Array<StackSpec> = [
      { blocks: [text(25), atomic(30, { keepNext: true }), text(7)] },
      { blocks: [text(12)], continuous: true, breakAfter: 'page' },
      { blocks: [table(15, Array(20).fill(10))], continuous: true },
    ];
    const full = run(stacks);
    expect(full.checkpoints).toHaveLength(full.pages.length);
    // A checkpoint is plain data.
    const serialized = JSON.parse(JSON.stringify(full.checkpoints));
    for (let pageIndex = 1; pageIndex < full.pages.length; pageIndex += 1) {
      const resumed = run(stacks, { resumeFrom: serialized[pageIndex] });
      expect(describePages(resumed.pages)).toEqual(
        describePages(full.pages.slice(pageIndex)),
      );
    }
  });
});

describe('masonry', () => {
  const SEQUENTIAL: FragmentationOption = { columns: { fill: 'sequential' } };

  /** A unit of one paragraph of that many lines, or of the blocks given. */
  type UnitSpec = number | ReadonlyArray<BlockSpec>;

  /** The blocks of a masonry region of `columnCount` columns. */
  const masonry = (
    specs: ReadonlyArray<UnitSpec>,
    columnCount = 2,
  ): Array<BlockSpec> => {
    const region: MeasuredRegion = {
      id: 0,
      columnCount,
      columnGap: 10,
      fill: 'balance',
      masonry: { unitCount: specs.length },
    };
    return specs.flatMap((spec, index) =>
      (typeof spec === 'number' ? [text(spec)] : spec).map(
        (block, blockIndex): BlockSpec => ({
          ...block,
          region,
          unit: { index, opens: blockIndex === 0 },
        }),
      ),
    );
  };

  /** The packed order as `unit:page.column`. */
  const packed = ({ packedOrder }: ReturnType<typeof run>) =>
    packedOrder.map(
      ({ unit, pageIndex, columnIndex }) =>
        `${unit}:${pageIndex}.${columnIndex}`,
    );

  /** Every column of every page, in reading order. */
  const columnsOf = (pages: ReadonlyArray<PlacedPage>) =>
    pages.flatMap((page) =>
      page.items.flatMap((item) =>
        item.kind === 'region' ? item.columns : [],
      ),
    );

  test('packs each unit into the column that ends highest', () => {
    const result = run([{ blocks: masonry([3, 5, 2, 4, 1]) }], {
      profile: SEQUENTIAL,
    });
    expect(describePages(result.pages)).toEqual([
      ['columns(0.0[0-3] 0.2[0-2] 0.3[0-4] | 0.1[0-5] 0.4[0-1])'],
    ]);
    // The packed order reads the columns top to bottom, left to right.
    expect(packed(result)).toEqual([
      '0:0.0',
      '2:0.0',
      '3:0.0',
      '1:0.1',
      '4:0.1',
    ]);
  });

  test('packs a later unit that fits when the next one fits nowhere', () => {
    const result = run([{ blocks: masonry([6, 6, 5, 3, 2]) }], {
      profile: SEQUENTIAL,
    });
    expect(describePages(result.pages)).toEqual([
      ['columns(0.0[0-6] 0.3[0-3] | 0.1[0-6] 0.4[0-2])'],
      ['columns(0.2[0-5] | )'],
    ]);
    expect(packed(result)).toEqual([
      '0:0.0',
      '3:0.0',
      '1:0.1',
      '4:0.1',
      '2:1.0',
    ]);
  });

  test(`looks no more than ${MASONRY_LOOKAHEAD} units ahead`, () => {
    const firstPageUnits = (between: number) =>
      run(
        [
          {
            blocks: masonry([
              6,
              6,
              5,
              ...Array.from({ length: between }, () => 5),
              1,
            ]),
          },
        ],
        { profile: SEQUENTIAL },
      )
        .packedOrder.filter(({ pageIndex }) => pageIndex === 0)
        .map(({ unit }) => unit);
    expect(firstPageUnits(MASONRY_LOOKAHEAD - 1)).toEqual([
      0,
      3 + MASONRY_LOOKAHEAD - 1,
      1,
    ]);
    expect(firstPageUnits(MASONRY_LOOKAHEAD)).toEqual([0, 1]);
  });

  test('splits a unit taller than a column as flow does, and carries it on at the top of the next page', () => {
    const result = run([{ blocks: masonry([3, 25, 2]) }], {
      profile: SEQUENTIAL,
    });
    expect(describePages(result.pages)).toEqual([
      ['columns(0.0[0-3] 0.1[0-7] | 0.1[7-17])'],
      ['columns(0.1[17-25] | 0.2[0-2])'],
    ]);
    expect(packed(result)).toEqual([
      '0:0.0',
      '1:0.0',
      '1:0.1',
      '1:1.0',
      '2:1.1',
    ]);
  });

  test('keeps orphans and widows inside a unit that splits', () => {
    // One line would be left under the first unit, so the split unit starts
    // in the next column, and it carries two lines to the next page.
    const { pages } = run([{ blocks: masonry([9, 12]) }], {
      profile: SEQUENTIAL,
    });
    expect(describePages(pages)).toEqual([
      ['columns(0.0[0-9] | 0.1[0-10])'],
      ['columns(0.1[10-12] | )'],
    ]);
  });

  test('keeps a unit that keeps with the next one in its column', () => {
    const pagesWith = (keepNext: boolean) =>
      run([{ blocks: masonry([8, 7, [text(1, { keepNext })], 4]) }], {
        profile: SEQUENTIAL,
      }).pages;
    expect(describePages(pagesWith(false))).toEqual([
      ['columns(0.0[0-8] | 0.1[0-7] 0.2[0-1])'],
      ['columns(0.3[0-4] | )'],
    ]);
    expect(describePages(pagesWith(true))).toEqual([
      ['columns(0.0[0-8] | 0.1[0-7])'],
      ['columns(0.2[0-1] 0.3[0-4] | )'],
    ]);
  });

  test('balances the last page', () => {
    const blocks = masonry([14]);
    expect(describePages(run([{ blocks }]).pages)).toEqual([
      ['columns(0.0[0-7] | 0.0[7-14])'],
    ]);
    expect(
      describePages(run([{ blocks }], { profile: SEQUENTIAL }).pages),
    ).toEqual([['columns(0.0[0-10] | 0.0[10-14])']]);
    // Whole units packed into the shortest column already end close
    // together; balancing them keeps their order.
    const whole = masonry([2, 6, 2, 2, 1]);
    expect(packed(run([{ blocks: whole }]))).toEqual(
      packed(run([{ blocks: whole }], { profile: SEQUENTIAL })),
    );
  });

  test('starts a new page at a unit that opens with a forced break, and packs nothing ahead of it', () => {
    const result = run(
      [{ blocks: masonry([6, 6, 5, [text(1, { breakBefore: 'page' })], 1]) }],
      { profile: SEQUENTIAL },
    );
    expect(packed(result)).toEqual([
      '0:0.0',
      '1:0.1',
      '2:1.0',
      '3:2.0',
      '4:2.1',
    ]);
  });

  test('moves the units after a column break right of every column with content', () => {
    const breakBefore = 'column';
    const twoColumns = run(
      [{ blocks: masonry([3, [text(2, { breakBefore })], 1]) }],
      { profile: SEQUENTIAL },
    );
    // The first column is closed: the units after the break share the second.
    expect(packed(twoColumns)).toEqual(['0:0.0', '1:0.1', '2:0.1']);

    const threeColumns = run(
      [{ blocks: masonry([3, 2, [text(2, { breakBefore })], 1], 3) }],
      { profile: SEQUENTIAL },
    );
    expect(packed(threeColumns)).toEqual(['0:0.0', '1:0.1', '2:0.2', '3:0.2']);

    // With no column left, they start the next page, in source order.
    const full = run(
      [{ blocks: masonry([3, 2, [text(2, { breakBefore })], 1]) }],
      { profile: SEQUENTIAL },
    );
    expect(packed(full)).toEqual(['0:0.0', '1:0.1', '2:1.0', '3:1.1']);
  });

  test('carries the rest of a unit to the next column at a column break inside it', () => {
    const result = run(
      [
        {
          blocks: masonry([
            2,
            [text(2), text(3, { breakBefore: 'column' })],
            1,
          ]),
        },
      ],
      { profile: SEQUENTIAL },
    );
    expect(describePages(result.pages)).toEqual([
      ['columns(0.0[0-2] 0.1[0-2] | 0.2[0-3] 0.3[0-1])'],
    ]);
    expect(packed(result)).toEqual(['0:0.0', '1:0.0', '1:0.1', '2:0.1']);
  });

  test('ends the page at a page break inside a unit', () => {
    const result = run(
      [
        {
          blocks: masonry([2, [text(2), text(3, { breakBefore: 'page' })], 1]),
        },
      ],
      { profile: SEQUENTIAL },
    );
    // Nothing is packed after the break on its page, not even in the empty
    // column.
    expect(describePages(result.pages)).toEqual([
      ['columns(0.0[0-2] 0.1[0-2] | )'],
      ['columns(0.2[0-3] | 0.3[0-1])'],
    ]);
    expect(result.pages[1].startKind).toBe('break');
  });

  test('packs a single column in order, with the lookahead', () => {
    const result = run([{ blocks: masonry([6, 6, 3], 1) }], {
      profile: SEQUENTIAL,
    });
    expect(packed(result)).toEqual(['0:0.0', '2:0.0', '1:1.0']);
  });

  /** A deterministic pseudo-random sequence. */
  const random = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const randomUnits = (
    seed: number,
    { withBreaks = false } = {},
  ): Array<UnitSpec> => {
    const next = random(seed);
    const breakOf = (): BlockSpec['breakBefore'] => {
      const value = next();
      return !withBreaks || value >= 0.1
        ? undefined
        : value < 0.04
          ? 'page'
          : 'column';
    };
    return Array.from({ length: 25 }, () =>
      Array.from({ length: Math.floor(next() * 3) + 1 }, () => {
        const flags: BlockSpec = {
          keepNext: next() < 0.2,
          keepLines: next() < 0.1,
          marginTop: Math.floor(next() * 20),
          marginBottom: Math.floor(next() * 20),
          breakBefore: breakOf(),
        };
        return next() < 0.2
          ? atomic(Math.floor(next() * 120) + 1, flags)
          : text(Math.floor(next() * 18) + 1, flags);
      }),
    );
  };

  test('is deterministic, places every line once and reads every unit on from column to column', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      // Half the runs have forced breaks, between units and inside them.
      const specs = randomUnits(seed, { withBreaks: seed > 30 });
      for (const columnCount of [2, 3]) {
        for (const profile of ['word', 'css'] as const) {
          const stacks = [{ blocks: masonry(specs, columnCount) }];
          const result = run(stacks, { profile });
          expect(run(stacks, { profile })).toEqual(result);

          // Every page places something.
          for (const page of result.pages) {
            expect(columnsOf([page]).flat().length).toBeGreaterThan(0);
          }

          // Every line or box of every block is placed exactly once.
          const columns = columnsOf(result.pages);
          const placed = columns
            .flat()
            .flatMap(({ block, from, to }) =>
              Array.from(
                { length: to - from },
                (_value, offset) => `${block.index}:${from + offset}`,
              ),
            );
          const expected = stacks[0].blocks.flatMap((spec, index) =>
            Array.from(
              { length: unitCountOf(toBlock(spec, 0, index)) },
              (_value, unit) => `${index}:${unit}`,
            ),
          );
          expect([...placed].sort()).toEqual([...expected].sort());

          // A unit's pieces follow one another in reading order: it ends
          // every column it carries on from and opens the one it goes on in,
          // so it is never seen again once another unit came after it.
          const filled = columns.filter((column) => column.length > 0);
          const done = new Set<number>();
          let current: undefined | number = undefined;
          for (const placement of filled.flat()) {
            const unit = placement.block.unit?.index;
            if (unit !== current) {
              expect(unit === undefined || done.has(unit)).toBe(false);
              if (current !== undefined) {
                done.add(current);
              }
              current = unit;
            }
          }

          // Nothing after a forced break between units is read before what
          // comes before it, and after a page break it starts a later page.
          const firstEntry = (unit: number) =>
            result.packedOrder.findIndex((entry) => entry.unit === unit);
          specs.forEach((spec, unit) => {
            const opening = typeof spec === 'number' ? undefined : spec[0];
            if (unit === 0 || opening?.breakBefore === undefined) {
              return;
            }
            const before = result.packedOrder
              .map((entry, position) => ({ ...entry, position }))
              .filter((entry) => entry.unit < unit);
            const at = result.packedOrder[firstEntry(unit)];
            for (const entry of before) {
              expect(entry.position).toBeLessThan(firstEntry(unit));
              if (opening.breakBefore === 'page') {
                expect(entry.pageIndex).toBeLessThan(at.pageIndex);
              }
            }
          });
        }
      }
    }
  });

  test('resuming from a page packs the same pages and the same order from there on', () => {
    const stacks: Array<StackSpec> = [
      { blocks: masonry(randomUnits(7)) },
      { blocks: [text(5)], continuous: true },
    ];
    const full = run(stacks);
    expect(full.pages.length).toBeGreaterThan(2);
    const serialized: ReadonlyArray<Checkpoint> = JSON.parse(
      JSON.stringify(full.checkpoints),
    );
    for (let pageIndex = 1; pageIndex < full.pages.length; pageIndex += 1) {
      const checkpoint = serialized[pageIndex];
      const resumed = run(stacks, { resumeFrom: checkpoint });
      expect(describePages(resumed.pages)).toEqual(
        describePages(full.pages.slice(pageIndex)),
      );
      expect(resumed.packedOrder).toEqual(
        full.packedOrder.slice(checkpoint.packedCount),
      );
    }
  });
});
