import type { Paragraph, Table } from 'docx';
import type { FragmentationLayout } from '../../fragmenter/model';

/**
 * Masonry columns in a DOCX. Word fills columns one after another and cannot
 * pack, so the units are written in the order the Fragmenter packed them in a
 * layout run, with an explicit break wherever it ended a column or a page
 * between two units. A unit it split across columns flows on by itself, as
 * Word breaks it by the same rules.
 */

type MasonryBlock = Paragraph | Table;

/** What one direct child of a masonry stack maps to, before it is packed. */
export class MasonryUnit {
  readonly children: ReadonlyArray<unknown>;

  constructor(children: ReadonlyArray<unknown>) {
    this.children = children;
  }
}

/** The content of a masonry stack: the blocks of each unit, in source order. */
export class MasonryContent {
  readonly units: ReadonlyArray<ReadonlyArray<MasonryBlock>>;

  constructor(units: ReadonlyArray<ReadonlyArray<MasonryBlock>>) {
    this.units = units;
  }
}

/** A break between two units: to the next column (`count` times) or page. */
export type MasonryBreak = { kind: 'column'; count: number } | { kind: 'page' };

export const MISSING_MASONRY_LAYOUT_MESSAGE =
  "The document has masonry columns (`columns.fill: 'masonry'`), whose order comes from laying the document out. Pass a `browser` to `reactToDocx`, as to `reactToPdf`.";

/**
 * The blocks of one masonry stack in packed order, with the layout's column
 * and page ends between units as explicit breaks.
 *
 * A unit the layout never showed (none of it was laid out) keeps its place
 * after the unit before it in the source.
 */
export const packMasonryUnits = <TBlock>(
  units: ReadonlyArray<ReadonlyArray<TBlock>>,
  {
    stackIndex,
    stackCount,
    layout,
    withBreakAfter,
    createBreak,
  }: {
    stackIndex: number;
    stackCount: number;
    layout: FragmentationLayout;
    /** `block` ending with the break, or `undefined` when it cannot. */
    withBreakAfter: (
      block: TBlock,
      masonryBreak: MasonryBreak,
    ) => undefined | TBlock;
    /** A block of its own that holds only the break. */
    createBreak: (masonryBreak: MasonryBreak) => TBlock;
  },
): Array<TBlock> => {
  const laidOut = layout.masonryStacks.find(
    (stack) => stack.stackIndex === stackIndex,
  );
  if (
    layout.stackCount !== stackCount ||
    (laidOut && laidOut.unitCount !== units.length)
  ) {
    throw new Error(
      `Masonry stack ${stackIndex + 1} does not match its layout (${units.length} units in ${stackCount} stacks here, ${laidOut?.unitCount ?? 0} in ${layout.stackCount} there). Its units and the stacks must render the same in the DOCX and the PDF markup.`,
    );
  }

  const entries = layout.packedOrder.filter(
    (entry) => entry.stackIndex === stackIndex,
  );
  const shown = new Set(entries.map(({ unit }) => unit));
  const written = new Set<number>();
  const blocks: Array<TBlock> = [];

  /** Writes a unit, then the units after it the layout never showed. */
  const write = (unit: number) => {
    for (
      let next = unit;
      next < units.length && (next === unit || !shown.has(next));
      next += 1
    ) {
      if (!written.has(next)) {
        written.add(next);
        blocks.push(...units[next]);
      }
    }
  };

  const addBreak = (masonryBreak: MasonryBreak) => {
    const last = blocks.at(-1);
    const ended =
      last === undefined ? undefined : withBreakAfter(last, masonryBreak);
    if (ended === undefined) {
      blocks.push(createBreak(masonryBreak));
    } else {
      blocks[blocks.length - 1] = ended;
    }
  };

  // Units before the first one shown come first, as they do in the source.
  for (let unit = 0; unit < units.length && !shown.has(unit); unit += 1) {
    write(unit);
  }
  entries.forEach((entry, index) => {
    const previous = entries[index - 1];
    // A unit that goes on in the next column flows there by itself.
    if (previous && previous.unit !== entry.unit) {
      if (entry.pageIndex !== previous.pageIndex) {
        addBreak({ kind: 'page' });
      } else if (entry.columnIndex > previous.columnIndex) {
        addBreak({
          kind: 'column',
          count: entry.columnIndex - previous.columnIndex,
        });
      }
    }
    write(entry.unit);
  });
  return blocks;
};
