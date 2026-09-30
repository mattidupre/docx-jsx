import {
  COLUMNS_DATA_ATTRIBUTES,
  decodeElementData,
  isElementOfType,
  isMasonryUnit,
  type ElementData,
} from '../entities';
import {
  type BlockKind,
  type BoundaryKind,
  type BoxSize,
  type CellLines,
  type ColumnFill,
  type ElementKind,
  type MeasuredBlock,
  type MeasuredRegion,
  type MeasuredStack,
  type SplitRow,
  FIT_EPSILON_PX,
} from './model';
import type { ClassifyInput, FragmentationProfile } from './profile';

/**
 * The measuring step: lays a stack out once, unpaginated, at the content
 * width of the page it starts on, and reads the measured block model off it.
 * The DOM side of every block (which nodes a unit starts at, which
 * containers wrap it) is kept apart from the model for the render step.
 */

export type StyledElement = HTMLElement | SVGElement;

export const isStyledElement = (node: unknown): node is StyledElement =>
  node instanceof HTMLElement || node instanceof SVGElement;

/** A boundary point in the source content. */
export type DomPosition = { node: Node; offset: number };

export type DomBlock = {
  source: StyledElement;
  /**
   * Where each unit starts in the source content, for text and list blocks;
   * `unitStarts[0]` is the start of the block and left out.
   */
  unitStarts: ReadonlyArray<undefined | DomPosition>;
  /**
   * For a table: the body row each unit starts in, and for a unit that starts
   * inside a row, how many lines of each of its cells come before it.
   */
  tableUnits: ReadonlyArray<TableUnit>;
  /** For a table: where every line of every cell of a split row starts. */
  rowLines: ReadonlyMap<
    HTMLTableRowElement,
    ReadonlyArray<ReadonlyArray<DomPosition>>
  >;
  /** A justified block, whose first piece has to justify its last line. */
  justified: boolean;
  /** The containers between the stack element and the block, outermost first. */
  ancestors: ReadonlyArray<StyledElement>;
  /** The elements whose top margins make up the block's `marginTop`. */
  topMarginElements: ReadonlyArray<StyledElement>;
  /** The elements whose bottom margins make up the block's `marginBottom`. */
  bottomMarginElements: ReadonlyArray<StyledElement>;
};

export type TableUnit = {
  row: HTMLTableRowElement;
  cut: undefined | ReadonlyArray<number>;
};

/** The blocks a container wraps: indexes of its first and last. */
export type ContainerSpan = { first: number; last: number };

export type MeasuredStackDom = {
  stack: MeasuredStack;
  source: HTMLElement;
  blocks: ReadonlyArray<DomBlock>;
  /** Every container that wraps at least one block, the stack included. */
  containers: ReadonlyMap<StyledElement, ContainerSpan>;
  /** The multi-column element of each region, by region id. */
  regions: ReadonlyMap<number, HTMLElement>;
};

/** Displays whose children the Fragmenter may visit one by one. */
const DESCENDED_DISPLAYS = new Set(['block', 'flow-root', 'list-item']);

/** Block-level displays a visited container's children may have. */
const BLOCK_LEVEL_DISPLAYS = new Set([
  ...DESCENDED_DISPLAYS,
  'table',
  'flex',
  'grid',
]);

/** Elements laid out as one box on a line, whatever their display. */
const ATOMIC_INLINE_TAGS = new Set([
  'img',
  'svg',
  'video',
  'audio',
  'canvas',
  'iframe',
  'object',
  'embed',
  'input',
  'select',
  'textarea',
  'button',
  'math',
]);

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCount = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cloneDeep = (element: StyledElement): StyledElement => {
  const clone = element.cloneNode(true);
  if (!isStyledElement(clone)) {
    throw new TypeError('Expected an element clone.');
  }
  return clone;
};

/** Pairs every node of `source` with the node at the same place in `clone`. */
export const pairNodes = (
  source: Node,
  clone: Node,
  pairs: Map<Node, Node>,
): Map<Node, Node> => {
  pairs.set(source, clone);
  const sourceChildren = source.childNodes;
  const cloneChildren = clone.childNodes;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const cloneChild = cloneChildren[index];
    if (cloneChild) {
      pairNodes(sourceChildren[index], cloneChild, pairs);
    }
  }
  return pairs;
};

const hasOwnText = (element: Element): boolean =>
  Array.from(element.childNodes).some(
    (node) => node instanceof Text && node.data.trim().length > 0,
  );

const forcedBreakOf = (value: string): undefined | 'page' | 'column' =>
  value === 'column'
    ? 'column'
    : ['page', 'always', 'left', 'right', 'recto', 'verso'].includes(value)
      ? 'page'
      : undefined;

const avoidsBreak = (value: string): boolean =>
  value === 'avoid' || value === 'avoid-page';

const elementDataOf = (element: Element): undefined | ElementData => {
  const properties: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    properties[attribute.name] = attribute.value;
  }
  try {
    return decodeElementData({ properties });
  } catch {
    return undefined;
  }
};

/** Whether a child of a masonry region is one of its units. */
const isMasonryUnitElement = (element: Element): boolean =>
  isMasonryUnit({
    tagName: element.tagName,
    elementType: elementDataOf(element)?.elementType,
  });

type Edge =
  | { margin: number; element: StyledElement }
  | { inset: number; barrier: boolean };

type ResolvedEdges = {
  margin: number;
  inset: number;
  elements: Array<StyledElement>;
};

/** CSS margin collapsing over a run of adjoining margins. */
const collapseAll = (margins: ReadonlyArray<number>): number =>
  Math.max(0, ...margins) + Math.min(0, ...margins);

/**
 * Splits the edges above (or, reversed, below) a block into the outer
 * collapsible margin and everything inside it. Margins collapse while no
 * border, padding or formatting context root separates them.
 */
const resolveEdges = (edges: ReadonlyArray<Edge>): ResolvedEdges => {
  // Runs of adjoining margins, split wherever an inset separates them.
  const runs: Array<{
    margins: Array<number>;
    elements: Array<StyledElement>;
  }> = [{ margins: [], elements: [] }];
  let inset = 0;
  for (const edge of edges) {
    if ('margin' in edge) {
      const run = runs[runs.length - 1];
      run.margins.push(edge.margin);
      run.elements.push(edge.element);
    } else if (edge.inset !== 0 || edge.barrier) {
      inset += edge.inset;
      runs.push({ margins: [], elements: [] });
    }
  }
  const [outer, ...inner] = runs;
  return {
    margin: collapseAll(outer.margins),
    inset: inner.reduce((sum, run) => sum + collapseAll(run.margins), inset),
    elements: outer.elements,
  };
};

type LineBox = { top: number; bottom: number; start: DomPosition };

/**
 * The line and cap height of a block whose text box is trimmed at both ends
 * (`text-box: trim-both`), read off its geometry: a trimmed box of n lines is
 * n − 1 line heights and one cap height tall. The line height is absolute
 * wherever the library trims (`nodeToDom` resolves it), so it is read from
 * the computed style.
 */
const trimOf = (
  style: CSSStyleDeclaration,
  lineCount: number,
  contentHeight: number,
): MeasuredBlock['trim'] => {
  const lineHeight = toPx(style.lineHeight);
  if (
    style.getPropertyValue('text-box-trim') !== 'trim-both' ||
    lineHeight <= 0 ||
    lineCount === 0
  ) {
    return undefined;
  }
  return {
    lineHeight,
    capHeight: contentHeight - (lineCount - 1) * lineHeight,
  };
};

type InlineItem =
  { kind: 'text'; node: Text } | { kind: 'atomic'; element: StyledElement };

const collectInline = (
  element: Element,
  items: Array<InlineItem>,
  floats: Array<DOMRect>,
) => {
  for (const node of Array.from(element.childNodes)) {
    if (node instanceof Text) {
      items.push({ kind: 'text', node });
      continue;
    }
    if (!isStyledElement(node)) {
      continue;
    }
    const style = getComputedStyle(node);
    if (
      style.display === 'none' ||
      style.position === 'absolute' ||
      style.position === 'fixed'
    ) {
      continue;
    }
    if (style.float !== 'none') {
      floats.push(node.getBoundingClientRect());
      continue;
    }
    if (
      node instanceof SVGElement ||
      ATOMIC_INLINE_TAGS.has(node.tagName.toLowerCase()) ||
      style.display.startsWith('inline-')
    ) {
      items.push({ kind: 'atomic', element: node });
      continue;
    }
    collectInline(node, items, floats);
  }
};

/** The first offset in `text` whose character is laid out at or below `top`. */
const offsetAtLine = (text: Text, top: number, range: Range): number => {
  const centerOf = (offset: number): number => {
    for (let current = offset; current < text.length; current += 1) {
      range.setStart(text, current);
      range.setEnd(text, current + 1);
      const rect = Array.from(range.getClientRects()).find(
        (candidate) => candidate.height > 0,
      );
      if (rect) {
        return rect.top + rect.height / 2;
      }
    }
    return Number.POSITIVE_INFINITY;
  };
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (centerOf(middle) >= top) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
};

/** Whether `rect` sits on `line` rather than on the one below it. */
const overlapsLine = (line: LineBox, rect: DOMRect): boolean => {
  const overlap =
    Math.min(line.bottom, rect.bottom) - Math.max(line.top, rect.top);
  return overlap > Math.min(rect.height, line.bottom - line.top) / 2;
};

/**
 * The line boxes of `element`, found by clustering the rects of its text and
 * atomic inlines by vertical overlap, in document order (vivliostyle's
 * `findLinePositions`). A tall inline image or a larger run joins the line it
 * overlaps instead of opening one of its own. Floats are left out of the
 * lines and returned apart.
 */
const lineBoxesOf = (
  element: Element,
): { lines: Array<LineBox>; floats: Array<DOMRect> } => {
  const items: Array<InlineItem> = [];
  const floats: Array<DOMRect> = [];
  collectInline(element, items, floats);
  const range = document.createRange();
  const lines: Array<LineBox> = [];
  for (const item of items) {
    let rects: Array<DOMRect>;
    if (item.kind === 'text') {
      range.selectNodeContents(item.node);
      rects = Array.from(range.getClientRects());
    } else {
      rects = [item.element.getBoundingClientRect()];
    }
    rects.forEach((rect, rectIndex) => {
      if (rect.height <= 0 || (item.kind === 'text' && rect.width <= 0)) {
        return;
      }
      const line = lines.at(-1);
      if (line && overlapsLine(line, rect)) {
        line.top = Math.min(line.top, rect.top);
        line.bottom = Math.max(line.bottom, rect.bottom);
        return;
      }
      let start: DomPosition;
      if (item.kind === 'text') {
        start = {
          node: item.node,
          offset:
            rectIndex === 0 ? 0 : offsetAtLine(item.node, rect.top, range),
        };
      } else {
        const parent = item.element.parentNode;
        if (!parent) {
          return;
        }
        start = {
          node: parent,
          offset: Array.from(parent.childNodes).indexOf(item.element),
        };
      }
      lines.push({ top: rect.top, bottom: rect.bottom, start });
    });
  }
  return { lines, floats };
};

/**
 * The lines of every cell of a row, and the places the row can be cut at:
 * after each line of any cell, where every cell keeps the lines that end
 * above that line's bottom. The cells are aligned to the top first, as every
 * piece of a split row draws them.
 */
const splitRowOf = (
  row: HTMLTableRowElement,
): {
  cells: Array<CellLines>;
  cuts: Array<{ offset: number; lines: Array<number> }>;
  starts: Array<Array<DomPosition>>;
} => {
  const cellElements = Array.from(row.cells);
  for (const cell of cellElements) {
    cell.style.setProperty('vertical-align', 'top');
  }
  const rowTop = row.getBoundingClientRect().top;
  const starts: Array<Array<DomPosition>> = [];
  const cells = cellElements.map((cell): CellLines => {
    const style = getComputedStyle(cell);
    const insetTop = toPx(style.borderTopWidth) + toPx(style.paddingTop);
    const insetBottom =
      toPx(style.borderBottomWidth) + toPx(style.paddingBottom);
    const { lines } = lineBoxesOf(cell);
    starts.push(lines.map(({ start }) => start));
    // The content ends at its last line, or below it at the margin box of a
    // block that ends lower.
    const contentBottom = Math.max(
      rowTop + insetTop,
      ...lines.map(({ bottom }) => bottom),
      ...Array.from(cell.children, (child) => {
        const rect = child.getBoundingClientRect();
        return rect.bottom + toPx(getComputedStyle(child).marginBottom);
      }),
    );
    return {
      lines: lines.map(({ top, bottom }) => ({
        top: top - rowTop,
        bottom: bottom - rowTop,
      })),
      insetTop,
      insetBottom,
      bottom: contentBottom - rowTop + insetBottom,
    };
  });
  const offsets = [
    ...new Set(cells.flatMap(({ lines }) => lines.map(({ bottom }) => bottom))),
  ].sort((a, b) => a - b);
  const cuts: Array<{ offset: number; lines: Array<number> }> = [];
  for (const offset of offsets) {
    const lineCounts = cells.map(
      ({ lines }) =>
        lines.filter(({ bottom }) => bottom <= offset + FIT_EPSILON_PX).length,
    );
    const previous = cuts.at(-1)?.lines ?? cells.map(() => 0);
    const complete = lineCounts.every(
      (count, index) => count === cells[index].lines.length,
    );
    if (
      !complete &&
      lineCounts.some((count, index) => count !== previous[index])
    ) {
      cuts.push({ offset, lines: lineCounts });
    }
  }
  return { cells, cuts, starts };
};

const defaultKindOf = (
  source: StyledElement,
  style: CSSStyleDeclaration,
  children: ReadonlyArray<StyledElement>,
  styleOf: (element: StyledElement) => CSSStyleDeclaration,
): ElementKind => {
  if (source instanceof HTMLTableElement) {
    return source.tBodies.length > 0 &&
      Array.from(source.tBodies).some((body) => body.rows.length > 0)
      ? 'table'
      : 'atomic';
  }
  if (
    source instanceof SVGElement ||
    ATOMIC_INLINE_TAGS.has(source.tagName.toLowerCase()) ||
    !DESCENDED_DISPLAYS.has(style.display)
  ) {
    return 'atomic';
  }
  // Scroll containers are monolithic, as they are in Chrome's own
  // fragmentation and as a `cantSplit` row is in Word.
  const descend =
    style.overflowY === 'visible' &&
    children.length > 0 &&
    !hasOwnText(source) &&
    children.every((child) => {
      const childStyle = styleOf(child);
      return (
        child instanceof HTMLElement &&
        BLOCK_LEVEL_DISPLAYS.has(childStyle.display) &&
        childStyle.float === 'none'
      );
    });
  if (descend) {
    return 'container';
  }
  return style.display === 'list-item' ? 'list' : 'text';
};

type BlockDraft = {
  block: MeasuredBlock;
  dom: DomBlock;
  bottomEdges: Array<Edge>;
};

/**
 * Measures one stack in `root`, a box that carries the content root class
 * and the render's scoped stylesheets, at `size`.
 */
export const measureStack = ({
  root,
  profile,
  stackSource,
  stackIndex,
  size,
  measurement,
  continuations,
}: {
  root: HTMLElement;
  profile: FragmentationProfile;
  stackSource: HTMLElement;
  stackIndex: number;
  size: BoxSize;
  /** Which measurement of the stack this is. */
  measurement: number;
  /**
   * The elements of `stackSource` that are what is left of a block split
   * before, with the kind of that block. Each is measured as a block of that
   * kind that continues.
   */
  continuations: ReadonlyMap<StyledElement, BlockKind>;
}): MeasuredStackDom => {
  const box = document.createElement('div');
  box.style.setProperty('width', `${size.width}px`);
  box.style.setProperty('display', 'flow-root');
  root.appendChild(box);
  try {
    const stackMeasured = cloneDeep(stackSource);
    box.appendChild(stackMeasured);
    const pairs = pairNodes(stackSource, stackMeasured, new Map());
    const sources = new Map<Node, Node>();
    pairs.forEach((measured, source) => sources.set(measured, source));
    const measuredOf = (source: StyledElement): StyledElement => {
      const measured = pairs.get(source);
      if (!isStyledElement(measured)) {
        throw new TypeError('Expected a measured element.');
      }
      return measured;
    };
    const styleOf = (source: StyledElement) =>
      getComputedStyle(measuredOf(source));
    const toSourcePosition = ({ node, offset }: DomPosition): DomPosition => {
      const source = sources.get(node);
      if (!source) {
        throw new TypeError('Expected a source node.');
      }
      return { node: source, offset };
    };

    // A multi-column stack wraps its content in one multicol element. Its
    // columns are laid out by the Fragmenter, so it is measured as one column.
    const regions = new Map<number, HTMLElement>();
    let regionSource: undefined | HTMLElement = undefined;
    let region: undefined | MeasuredRegion = undefined;
    for (const element of Array.from(stackSource.querySelectorAll('*'))) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }
      const measured = measuredOf(element);
      const style = getComputedStyle(measured);
      const columnCount = toCount(style.columnCount, 1);
      // Masonry packs even a single column, where it reorders the units.
      const masonry =
        element.getAttribute(
          COLUMNS_DATA_ATTRIBUTES.dataAttribute('columnFill'),
        ) === 'masonry'
          ? {
              unitCount: Array.from(element.children).filter(
                isMasonryUnitElement,
              ).length,
            }
          : undefined;
      if (columnCount > 1 || masonry) {
        const columnGap = toPx(style.columnGap);
        const fill: ColumnFill =
          style.columnFill === 'auto' || style.columnFill === 'balance-all'
            ? style.columnFill
            : 'balance';
        regionSource = element;
        region = {
          id: regions.size,
          columnCount,
          columnGap,
          fill,
          masonry,
        };
        regions.set(region.id, element);
        measured.style.setProperty('column-count', 'auto');
        measured.style.setProperty(
          'width',
          `${(size.width - columnGap * (columnCount - 1)) / columnCount}px`,
        );
        break;
      }
    }

    const drafts: Array<BlockDraft> = [];
    const containers = new Map<StyledElement, ContainerSpan>();
    let pendingTop: Array<Edge> = [];
    let pendingBreak: undefined | 'page' | 'column' = undefined;
    const ancestors: Array<StyledElement> = [];
    let currentRegion: undefined | MeasuredRegion = undefined;
    let currentUnit: MeasuredBlock['unit'] = undefined;

    const addBreak = (value: undefined | 'page' | 'column') => {
      if (value === 'page' || (value === 'column' && pendingBreak !== 'page')) {
        pendingBreak = value;
      }
    };

    const openEdges = (element: StyledElement, style: CSSStyleDeclaration) => {
      const barrier =
        style.display === 'flow-root' || style.overflowY !== 'visible';
      pendingTop.push(
        { margin: toPx(style.marginTop), element },
        {
          inset: toPx(style.borderTopWidth) + toPx(style.paddingTop),
          barrier,
        },
      );
    };

    const closeEdges = (element: StyledElement, style: CSSStyleDeclaration) => {
      const barrier =
        style.display === 'flow-root' || style.overflowY !== 'visible';
      drafts.at(-1)?.bottomEdges.push(
        {
          inset: toPx(style.borderBottomWidth) + toPx(style.paddingBottom),
          barrier,
        },
        { margin: toPx(style.marginBottom), element },
      );
    };

    const measureLeaf = (
      source: StyledElement,
      style: CSSStyleDeclaration,
      kind: BlockKind,
      keepGroup: undefined | Array<MeasuredBlock>,
    ) => {
      const measured = measuredOf(source);
      const rect = measured.getBoundingClientRect();
      const insetTop = toPx(style.borderTopWidth) + toPx(style.paddingTop);
      const insetBottom =
        toPx(style.borderBottomWidth) + toPx(style.paddingBottom);
      let height = rect.height;
      let bounds: Array<number> = [0, height];
      let boundaries: Array<BoundaryKind> = ['edge', 'edge'];
      let unitStarts: Array<undefined | DomPosition> = [undefined];
      const tableUnits: Array<TableUnit> = [];
      const splitRows: Array<SplitRow> = [];
      const rowLines = new Map<
        HTMLTableRowElement,
        ReadonlyArray<ReadonlyArray<DomPosition>>
      >();
      let repeatHeight = 0;
      let repeatHeader = false;
      let trim: MeasuredBlock['trim'] = undefined;

      if (
        kind === 'table' &&
        source instanceof HTMLTableElement &&
        measured instanceof HTMLTableElement
      ) {
        const data = elementDataOf(source);
        repeatHeader =
          data !== undefined &&
          isElementOfType(data, 'table') &&
          data.elementOptions.repeatHeader;
        repeatHeight = measured.tHead?.getBoundingClientRect().height ?? 0;
        bounds = [];
        boundaries = [];
        const rows = Array.from(source.tBodies).flatMap((body) =>
          Array.from(body.rows),
        );
        // Every row is read before any is cut up: aligning a row's cells to
        // the top for its lines may change the heights of the rows after it.
        const measuredRows = rows.flatMap((row) => {
          const measuredRow = measuredOf(row);
          return measuredRow instanceof HTMLTableRowElement
            ? [
                {
                  row,
                  measuredRow,
                  rect: measuredRow.getBoundingClientRect(),
                  kept: avoidsBreak(getComputedStyle(measuredRow).breakInside),
                },
              ]
            : [];
        });
        measuredRows.forEach(({ row, measuredRow, rect: rowRect, kept }) => {
          const unit = bounds.length;
          tableUnits.push({ row, cut: undefined });
          bounds.push(rowRect.top - rect.top);
          boundaries.push(unit === 0 ? 'edge' : 'row');
          // Only a row that may split, or one too tall for any page, needs
          // the places it can be cut at.
          if (kept && rowRect.height <= size.height) {
            return;
          }
          const { cells, cuts, starts } = splitRowOf(measuredRow);
          if (cuts.length === 0) {
            return;
          }
          splitRows.push({
            unit,
            height: rowRect.height,
            cells,
            cuts: cuts.map(({ lines }) => lines),
          });
          rowLines.set(
            row,
            starts.map((cellStarts) => cellStarts.map(toSourcePosition)),
          );
          for (const cut of cuts) {
            tableUnits.push({ row, cut: cut.lines });
            bounds.push(rowRect.top - rect.top + cut.offset);
            boundaries.push(kept ? 'within-kept-row' : 'within-row');
          }
        });
        bounds.push(height);
        boundaries.push('edge');
      } else if (kind === 'text' || kind === 'list') {
        const { lines, floats } = lineBoxesOf(measured);
        const floatBottom = Math.max(
          0,
          ...floats.map((floatRect) => floatRect.bottom - rect.top),
        );
        // A float that hangs below the block is room it takes on the page.
        height = Math.max(height, floatBottom + insetBottom);
        if (lines.length > 0) {
          trim = trimOf(
            style,
            lines.length,
            rect.height - insetTop - insetBottom,
          );
          const lineTrim = trim;
          // A trimmed piece ends at the baseline of its last line, so that is
          // where a trimmed block's boundaries are.
          const inner = lines
            .slice(1)
            .map((line, index) =>
              lineTrim
                ? insetTop + lineTrim.capHeight + index * lineTrim.lineHeight
                : (lines[index].bottom + line.top) / 2 - rect.top,
            );
          bounds = [insetTop, ...inner, height - insetBottom];
          for (let index = 1; index < bounds.length; index += 1) {
            bounds[index] = Math.max(bounds[index], bounds[index - 1]);
          }
          boundaries = [
            'edge',
            ...inner.map((boundary): BoundaryKind =>
              floats.some(
                (floatRect) =>
                  floatRect.top - rect.top < boundary - FIT_EPSILON_PX &&
                  floatRect.bottom - rect.top > boundary + FIT_EPSILON_PX,
              )
                ? 'blocked'
                : 'line',
            ),
            'edge',
          ];
          unitStarts = [
            undefined,
            ...lines.slice(1).map((line) => toSourcePosition(line.start)),
          ];
        }
      }

      const topEdges = resolveEdges([
        ...pendingTop,
        { margin: toPx(style.marginTop), element: source },
      ]);
      pendingTop = [];
      const keepLines =
        avoidsBreak(style.breakInside) || keepGroup !== undefined;
      // What is left of a split block was placed from on an earlier page: a
      // break or keep before it has been honoured there.
      const continuation = continuations.has(source);
      const block: MeasuredBlock = {
        stackIndex,
        measurement,
        index: drafts.length,
        continuation,
        kind: tableUnits.length > 0 || kind !== 'table' ? kind : 'atomic',
        region: currentRegion,
        unit:
          continuation && currentUnit
            ? { index: currentUnit.index, opens: false }
            : currentUnit,
        height,
        marginTop: topEdges.margin,
        insetTop: topEdges.inset,
        marginBottom: 0,
        insetBottom: 0,
        bounds,
        boundaries,
        splitRows,
        repeatHeight,
        repeatHeader,
        keepLines,
        keepNext: avoidsBreak(style.breakAfter),
        keepPrevious: !continuation && avoidsBreak(style.breakBefore),
        breakBefore: continuation ? undefined : pendingBreak,
        orphans: toCount(style.orphans, 2),
        widows: toCount(style.widows, 2),
        trim,
      };
      pendingBreak = undefined;
      if (currentUnit) {
        currentUnit = { index: currentUnit.index, opens: false };
      }
      keepGroup?.push(block);
      drafts.push({
        block,
        dom: {
          source,
          unitStarts,
          tableUnits,
          rowLines,
          justified: style.textAlign === 'justify',
          ancestors: [...ancestors],
          topMarginElements: topEdges.elements,
          bottomMarginElements: [],
        },
        bottomEdges: [{ margin: toPx(style.marginBottom), element: source }],
      });
    };

    const visit = (
      source: StyledElement,
      keepGroup: undefined | Array<MeasuredBlock>,
    ): void => {
      const style = styleOf(source);
      if (style.display === 'none') {
        return;
      }
      const continuedKind = continuations.get(source);
      if (continuedKind) {
        measureLeaf(source, style, continuedKind, keepGroup);
        addBreak(forcedBreakOf(style.breakAfter));
        return;
      }
      addBreak(forcedBreakOf(style.breakBefore));
      const children = Array.from(source.children).filter(isStyledElement);
      const defaultKind = defaultKindOf(source, style, children, styleOf);
      const data = elementDataOf(source);
      const input: ClassifyInput = {
        tagName: source.tagName.toLowerCase(),
        display: style.display,
        float: style.float,
        overflowY: style.overflowY,
        elementType: data?.elementType,
        hasOwnText: hasOwnText(source),
        childElementCount: children.length,
        defaultKind,
      };
      const kind =
        source === regionSource
          ? 'container'
          : (profile.classify?.(input) ?? defaultKind);

      if (kind === 'container' && children.length > 0) {
        const openedAt = pendingTop.length;
        const firstIndex = drafts.length;
        openEdges(source, style);
        ancestors.push(source);
        const previousRegion = currentRegion;
        if (source === regionSource) {
          currentRegion = region;
        }
        const groupsChildren =
          avoidsBreak(style.breakInside) && keepGroup === undefined;
        const group: undefined | Array<MeasuredBlock> = groupsChildren
          ? []
          : keepGroup;
        // Every unit child of a masonry region is one unit, counted as the
        // DOCX mapping counts them. A Break between two units is none: its
        // break applies to the unit after it.
        const masonry = source === regionSource && region?.masonry;
        let unitIndex = 0;
        Array.from(source.children).forEach((child) => {
          if (!isStyledElement(child)) {
            return;
          }
          if (masonry) {
            if (!isMasonryUnitElement(child)) {
              const childStyle = styleOf(child);
              addBreak(forcedBreakOf(childStyle.breakBefore));
              addBreak(forcedBreakOf(childStyle.breakAfter));
              return;
            }
            currentUnit = { index: unitIndex, opens: true };
            unitIndex += 1;
          }
          visit(child, group);
        });
        if (masonry) {
          currentUnit = undefined;
        }
        currentRegion = previousRegion;
        ancestors.pop();
        if (drafts.length === firstIndex) {
          pendingTop.length = openedAt;
        } else {
          containers.set(source, {
            first: firstIndex,
            last: drafts.length - 1,
          });
          closeEdges(source, style);
          if (groupsChildren && group) {
            // Word's BreakAvoid: every paragraph keeps with the next, and the
            // group's last one only when the group avoids a break after it.
            group.forEach((block, index) => {
              block.keepNext =
                index < group.length - 1 || avoidsBreak(style.breakAfter);
            });
          } else if (avoidsBreak(style.breakAfter)) {
            const last = drafts.at(-1);
            if (last) {
              last.block.keepNext = true;
            }
          }
        }
      } else {
        measureLeaf(
          source,
          style,
          kind === 'container' ? 'atomic' : kind,
          keepGroup,
        );
      }
      addBreak(forcedBreakOf(style.breakAfter));
    };

    const stackStyle = styleOf(stackSource);
    openEdges(stackSource, stackStyle);
    for (const child of Array.from(stackSource.children)) {
      if (isStyledElement(child)) {
        visit(child, undefined);
      }
    }
    if (drafts.length > 0) {
      containers.set(stackSource, { first: 0, last: drafts.length - 1 });
      closeEdges(stackSource, stackStyle);
    }

    const blocks: Array<MeasuredBlock> = [];
    const doms: Array<DomBlock> = [];
    for (const { block, dom, bottomEdges } of drafts) {
      const bottom = resolveEdges([...bottomEdges].reverse());
      block.marginBottom = bottom.margin;
      block.insetBottom = bottom.inset;
      blocks.push(block);
      doms.push({ ...dom, bottomMarginElements: bottom.elements });
    }

    return {
      stack: {
        width: size.width,
        blocks,
        breakAfter: pendingBreak === 'page' ? 'page' : undefined,
      },
      source: stackSource,
      blocks: doms,
      containers,
      regions,
    };
  } finally {
    box.remove();
  }
};
