import { describe, expect, test } from 'vitest';
import type { FragmentationOption } from '../entities';
import {
  unitCountOf,
  type BoundaryKind,
  type BoxSize,
  type MeasuredBlock,
  type MeasuredRegion,
  type MeasuredStack,
  type PlacedPage,
} from './model';
import { placePages, type PlacementInput } from './place';
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
  region: undefined,
  height: 0,
  marginTop: 0,
  insetTop: 0,
  marginBottom: 0,
  insetBottom: 0,
  bounds: [0, 0],
  boundaries: ['edge', 'edge'],
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

type StackSpec = {
  blocks: ReadonlyArray<BlockSpec>;
  continuous?: boolean;
  breakAfter?: 'page';
  /** The content size of the pages the stack owns. */
  size?: BoxSize;
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
  const result = placePages({
    profile: resolveFragmentationProfile(options.profile),
    stacks: stacks.map(({ continuous = false }) => ({ continuous })),
    measureStack: (stackIndex, size): MeasuredStack => {
      measured.push({ stackIndex, size });
      return {
        width: size.width,
        blocks: stacks[stackIndex].blocks.map((spec, index) =>
          toBlock(spec, stackIndex, index),
        ),
        breakAfter: stacks[stackIndex].breakAfter,
      };
    },
    startPage: (context) => {
      starts.push(context);
      return stacks[context.stackIndex].size ?? defaultSize;
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
});

describe('columns', () => {
  const regionOf = (fill: MeasuredRegion['fill']): MeasuredRegion => ({
    id: 0,
    columnCount: 2,
    columnGap: 10,
    fill,
  });
  const lines = (count: number, region: MeasuredRegion) =>
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
