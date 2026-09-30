import {
  unitCountOf,
  type BlockKind,
  type MeasuredBlock,
  type Piece,
  type PlacedPage,
  type Placement,
} from './model';
import {
  isStyledElement,
  pairNodes,
  type ContainerSpan,
  type DomBlock,
  type DomPosition,
  type MeasuredStackDom,
  type StyledElement,
} from './measure';

/**
 * The render step: builds each page's content from its placements, cloning
 * the source content. A block placed whole is a deep clone; a piece is the
 * range of its source between two unit starts, so inline ancestors come
 * along. The edges a break cuts through lose their margin, border and
 * padding, and are marked `data-split-from` / `data-split-to` for the page
 * stylesheet (a continued list item draws no second marker).
 */

const SPLIT_FROM_ATTRIBUTE = 'data-split-from';
const SPLIT_TO_ATTRIBUTE = 'data-split-to';

const cloneShallow = (element: StyledElement): StyledElement => {
  const clone = element.cloneNode(false);
  if (!isStyledElement(clone)) {
    throw new TypeError('Expected an element clone.');
  }
  return clone;
};

const cloneDeep = (element: StyledElement): StyledElement => {
  const clone = element.cloneNode(true);
  if (!isStyledElement(clone)) {
    throw new TypeError('Expected an element clone.');
  }
  return clone;
};

const markSplitFrom = (element: StyledElement) => {
  element.setAttribute(SPLIT_FROM_ATTRIBUTE, '');
  element.style.setProperty('margin-top', '0');
  element.style.setProperty('padding-top', '0');
  element.style.setProperty('border-top-width', '0');
  element.style.setProperty('text-indent', '0');
};

const markSplitTo = (element: StyledElement) => {
  element.setAttribute(SPLIT_TO_ATTRIBUTE, '');
  element.style.setProperty('margin-bottom', '0');
  element.style.setProperty('padding-bottom', '0');
  element.style.setProperty('border-bottom-width', '0');
};

/** An `<ol>` continued on a later page counts on from its first item there. */
const continueNumbering = (
  list: HTMLOListElement,
  clone: StyledElement,
  descendant: StyledElement,
) => {
  let item: null | Element = descendant;
  while (item && item.parentElement !== list) {
    item = item.parentElement;
  }
  const items: Array<Element> = Array.from(list.children).filter(
    (child) => child instanceof HTMLLIElement,
  );
  const itemIndex = item ? items.indexOf(item) : -1;
  if (itemIndex > 0) {
    clone.setAttribute('start', String(list.start + itemIndex));
  }
};

/**
 * Marks the elements a range cut through at one edge, in `clone`, its cloned
 * contents: the clones of the ancestors of the edge's node inside
 * `container`, which the range copied partially.
 */
const markCutEdge = (
  clone: Node,
  container: Node,
  { node }: DomPosition,
  edge: 'start' | 'end',
) => {
  const chain: Array<Node> = [];
  for (
    let ancestor: null | Node =
      node instanceof Element ? node : node.parentNode;
    ancestor && ancestor !== container;
    ancestor = ancestor.parentNode
  ) {
    chain.push(ancestor);
  }
  let current: null | Node = clone;
  for (let index = chain.length - 1; index >= 0 && current; index -= 1) {
    current = edge === 'start' ? current.firstChild : current.lastChild;
    if (!isStyledElement(current)) {
      return;
    }
    if (edge === 'start') {
      markSplitFrom(current);
    } else {
      markSplitTo(current);
    }
  }
};

/**
 * The same place in the content as `position`, as far up towards
 * `container` as it goes: the start of an element is the place just before
 * it. A cut there then copies no empty part of that element.
 */
const hoistPosition = (
  { node, offset }: DomPosition,
  container: Node,
): DomPosition => {
  let current = { node, offset };
  while (current.offset === 0 && current.node !== container) {
    const parent = current.node.parentNode;
    if (!parent) {
      break;
    }
    current = {
      node: parent,
      offset: Array.from<Node>(parent.childNodes).indexOf(current.node),
    };
  }
  return current;
};

/**
 * Lines `[first, end)` of a table cell, in a clone of the cell that keeps
 * its borders and padding. The blocks a cut goes through lose their margin,
 * border and padding on that side, as a split block does.
 */
const renderCellPiece = (
  cell: StyledElement,
  starts: ReadonlyArray<DomPosition>,
  first: number,
  end: number,
): StyledElement => {
  if (first === 0 && end === starts.length) {
    return cloneDeep(cell);
  }
  const clone = cloneShallow(cell);
  if (end <= first) {
    return clone;
  }
  const start = first === 0 ? undefined : hoistPosition(starts[first], cell);
  const stop =
    end === starts.length ? undefined : hoistPosition(starts[end], cell);
  const range = document.createRange();
  if (start) {
    range.setStart(start.node, start.offset);
  } else {
    range.setStart(cell, 0);
  }
  if (stop) {
    range.setEnd(stop.node, stop.offset);
  } else {
    range.setEnd(cell, cell.childNodes.length);
  }
  clone.appendChild(range.cloneContents());
  if (start) {
    markCutEdge(clone, cell, start, 'start');
  }
  if (stop) {
    markCutEdge(clone, cell, stop, 'end');
  }
  return clone;
};

/**
 * A piece of a split row: every cell shows its lines from the cut `from`
 * (the top of the row when `undefined`) to the cut `to` (the end of the
 * row), top aligned, so each line is drawn once, on one page.
 */
const renderRowPiece = (
  row: HTMLTableRowElement,
  lineStarts: ReadonlyArray<ReadonlyArray<DomPosition>>,
  from: undefined | ReadonlyArray<number>,
  to: undefined | ReadonlyArray<number>,
): StyledElement => {
  const rowClone = cloneShallow(row);
  rowClone.style.removeProperty('height');
  Array.from(row.cells).forEach((cell, cellIndex) => {
    const starts = lineStarts[cellIndex] ?? [];
    const cellClone = renderCellPiece(
      cell,
      starts,
      from?.[cellIndex] ?? 0,
      to?.[cellIndex] ?? starts.length,
    );
    cellClone.style.setProperty('vertical-align', 'top');
    rowClone.appendChild(cellClone);
  });
  if (from) {
    rowClone.setAttribute(SPLIT_FROM_ATTRIBUTE, '');
  }
  if (to) {
    rowClone.setAttribute(SPLIT_TO_ATTRIBUTE, '');
  }
  return rowClone;
};

/** Rows (or pieces of rows) `[from, to)` of a table, under its kept sections. */
const renderTablePiece = (
  dom: DomBlock,
  placement: Placement,
): StyledElement => {
  const { from, to, block } = placement;
  const source = dom.source;
  const element = cloneShallow(source);
  for (const child of Array.from(source.children)) {
    const tagName = child.tagName.toLowerCase();
    if (
      !isStyledElement(child) ||
      tagName === 'tbody' ||
      (from > 0 && tagName === 'caption') ||
      (from > 0 && tagName === 'thead' && !placement.repeatHeader)
    ) {
      continue;
    }
    element.appendChild(cloneDeep(child));
  }
  const rows =
    source instanceof HTMLTableElement
      ? Array.from(source.tBodies).flatMap((body) => Array.from(body.rows))
      : [];
  const start = dom.tableUnits[from];
  const end = to < unitCountOf(block) ? dom.tableUnits[to] : undefined;
  const startRow = rows.indexOf(start.row);
  const endRow = end ? rows.indexOf(end.row) : rows.length;
  const lastRow = end?.cut ? endRow : endRow - 1;
  const bodies = new Map<Element, StyledElement>();
  for (let rowIndex = startRow; rowIndex <= lastRow; rowIndex += 1) {
    const row = rows[rowIndex];
    const body = row.parentElement;
    if (!isStyledElement(body)) {
      continue;
    }
    let bodyClone = bodies.get(body);
    if (!bodyClone) {
      bodyClone = cloneShallow(body);
      bodies.set(body, bodyClone);
      element.appendChild(bodyClone);
    }
    const rowFrom = rowIndex === startRow ? start.cut : undefined;
    const rowTo = rowIndex === endRow ? end?.cut : undefined;
    const lineStarts = dom.rowLines.get(row);
    bodyClone.appendChild(
      lineStarts && (rowFrom || rowTo)
        ? renderRowPiece(row, lineStarts, rowFrom, rowTo)
        : cloneDeep(row),
    );
  }
  return element;
};

/** Lines `[from, to)` of a text or list block. */
const renderTextPiece = (
  dom: DomBlock,
  placement: Placement,
): StyledElement => {
  const { from, to, block } = placement;
  const { source } = dom;
  const range = document.createRange();
  const start = from === 0 ? undefined : dom.unitStarts[from];
  const end = to === unitCountOf(block) ? undefined : dom.unitStarts[to];
  if (start) {
    range.setStart(start.node, start.offset);
  } else {
    range.setStart(source, 0);
  }
  if (end) {
    range.setEnd(end.node, end.offset);
  } else {
    range.setEnd(source, source.childNodes.length);
  }
  const element = cloneShallow(source);
  element.appendChild(range.cloneContents());
  return element;
};

/**
 * Units `[from, to)` of a block: a deep clone when it is whole, else the
 * piece its kind cuts. The edges the piece is cut at are not marked yet.
 */
const renderPiece = (dom: DomBlock, placement: Placement): StyledElement => {
  const { block, from, to } = placement;
  if ((from === 0 && to === unitCountOf(block)) || block.kind === 'atomic') {
    return cloneDeep(dom.source);
  }
  return block.kind === 'table'
    ? renderTablePiece(dom, placement)
    : renderTextPiece(dom, placement);
};

/**
 * The source of a stack to measure again from the `pieces` that carry on:
 * a copy of the source of its measurement `stackDom`, in which the block of
 * each piece is replaced by what is left of it, cut as its continuation is
 * drawn (from the same place in its content, with its cut edge marked).
 * `repeatsHeader` says whether a table's rest opens with its header rows.
 */
export const continueStack = (
  stackDom: MeasuredStackDom,
  pieces: ReadonlyArray<Piece>,
  repeatsHeader: (block: MeasuredBlock) => boolean,
): {
  source: HTMLElement;
  continuations: Map<StyledElement, BlockKind>;
} => {
  const source = stackDom.source.cloneNode(true);
  if (!(source instanceof HTMLElement)) {
    throw new TypeError('Expected a stack clone.');
  }
  const pairs = pairNodes(stackDom.source, source, new Map());
  const continuations = new Map<StyledElement, BlockKind>();
  for (const { block, from } of pieces) {
    const dom = stackDom.blocks[block.index];
    const target = pairs.get(dom.source);
    if (!(target instanceof Element)) {
      throw new Error(`Block ${block.index + 1} was never measured.`);
    }
    const rest = renderPiece(dom, {
      block,
      from,
      to: unitCountOf(block),
      marginTop: 0,
      repeatHeader: from > 0 && repeatsHeader(block),
      bottom: 0,
    });
    if (from > 0) {
      markSplitFrom(rest);
    }
    target.replaceWith(rest);
    continuations.set(rest, block.kind);
  }
  return { source, continuations };
};

type Track = { span: ContainerSpan; last: number; complete: boolean };

/** Whether a placement carries on from a piece of its block placed before. */
const continues = ({ block, from }: Placement): boolean =>
  from > 0 || block.continuation;

/**
 * Builds the content of one page. `stackDomOf` returns the measurement a
 * block of the page's placements comes from.
 */
export const renderPage = (
  page: PlacedPage,
  stackDomOf: (block: MeasuredBlock) => MeasuredStackDom,
): HTMLElement => {
  const contentElement = document.createElement('div');
  const stackClones = new Map<number, StyledElement>();
  const tracks = new Map<StyledElement, Track>();
  const flowClones = new Map<StyledElement, StyledElement>();

  const track = (
    clone: StyledElement,
    span: ContainerSpan,
    placement: Placement,
  ) => {
    const complete = placement.to === unitCountOf(placement.block);
    const current = tracks.get(clone);
    if (!current || placement.block.index >= current.last) {
      tracks.set(clone, { span, last: placement.block.index, complete });
    }
  };

  const stackCloneOf = (placement: Placement): StyledElement => {
    const { stackIndex } = placement.block;
    const stackDom = stackDomOf(placement.block);
    let clone = stackClones.get(stackIndex);
    if (!clone) {
      clone = cloneShallow(stackDom.source);
      if (placement.block.index > 0 || continues(placement)) {
        markSplitFrom(clone);
      }
      stackClones.set(stackIndex, clone);
      contentElement.appendChild(clone);
    }
    const span = stackDom.containers.get(stackDom.source);
    if (span) {
      track(clone, span, placement);
    }
    return clone;
  };

  /** Clones the containers of `chain` under `root`, reusing clones in `map`. */
  const ensureChain = (
    placement: Placement,
    root: StyledElement,
    chain: ReadonlyArray<StyledElement>,
    map: Map<StyledElement, StyledElement>,
  ): StyledElement => {
    const stackDom = stackDomOf(placement.block);
    const dom = stackDom.blocks[placement.block.index];
    let parent = root;
    for (const ancestor of chain) {
      const span = stackDom.containers.get(ancestor);
      let clone = map.get(ancestor);
      if (!clone) {
        clone = cloneShallow(ancestor);
        if (
          span &&
          (span.first < placement.block.index || continues(placement))
        ) {
          markSplitFrom(clone);
          if (ancestor instanceof HTMLOListElement) {
            continueNumbering(ancestor, clone, dom.source);
          }
        }
        map.set(ancestor, clone);
        parent.appendChild(clone);
      }
      if (span) {
        track(clone, span, placement);
      }
      parent = clone;
    }
    return parent;
  };

  /** Renders one placement into `parent`, and sets its margins. */
  const renderPlacement = (
    placement: Placement,
    parent: StyledElement,
    map: Map<StyledElement, StyledElement>,
    previous: undefined | Placement,
  ) => {
    const { block, from, to } = placement;
    const stackDom = stackDomOf(block);
    const dom = stackDom.blocks[block.index];
    const unitCount = unitCountOf(block);
    const element = renderPiece(dom, placement);
    // A continuation measured on its own is marked already.
    if (from > 0) {
      markSplitFrom(element);
    }
    if (to < unitCount) {
      markSplitTo(element);
      if (dom.justified) {
        element.style.setProperty('text-align-last', 'justify');
      }
    }
    parent.appendChild(element);
    map.set(dom.source, element);

    if (continues(placement)) {
      // A continuation's own space: the inset of a trimmed first line.
      if (placement.marginTop !== 0) {
        element.style.setProperty('margin-top', `${placement.marginTop}px`);
      }
      return;
    }
    // The browser collapses margins by itself. Where the profile placed the
    // block differently (a truncated margin at the top of a box, or margins
    // that add up), the margins are written out: the previous block's
    // bottom margins go, and the outermost top margin carries the space.
    const collapsed = previous
      ? Math.max(block.marginTop, previous.block.marginBottom, 0) +
        Math.min(block.marginTop, previous.block.marginBottom, 0)
      : block.marginTop;
    if (placement.marginTop === collapsed) {
      return;
    }
    const cloneOf = (owner: MeasuredBlock, marginElement: StyledElement) =>
      marginElement === stackDomOf(owner).source
        ? stackClones.get(owner.stackIndex)
        : (map.get(marginElement) ?? flowClones.get(marginElement));
    if (previous) {
      const previousDom = stackDomOf(previous.block).blocks[
        previous.block.index
      ];
      for (const marginElement of previousDom.bottomMarginElements) {
        cloneOf(previous.block, marginElement)?.style.setProperty(
          'margin-bottom',
          '0',
        );
      }
    }
    // In a column the space goes on the outermost element inside it: the
    // containers outside the region are drawn above every column.
    const carrier =
      map === flowClones
        ? 0
        : dom.topMarginElements.findIndex((marginElement) =>
            map.has(marginElement),
          );
    dom.topMarginElements.forEach((marginElement, index) => {
      const clone = cloneOf(block, marginElement);
      clone?.style.setProperty(
        'margin-top',
        index === carrier ? `${placement.marginTop}px` : '0',
      );
    });
  };

  let previousFlow: undefined | Placement = undefined;
  for (const item of page.items) {
    if (item.kind === 'flow') {
      const { placement } = item;
      const dom = stackDomOf(placement.block).blocks[placement.block.index];
      const parent = ensureChain(
        placement,
        stackCloneOf(placement),
        dom.ancestors,
        flowClones,
      );
      renderPlacement(placement, parent, flowClones, previousFlow);
      previousFlow = placement;
      continue;
    }

    const firstPlacement = item.columns.flat().at(0);
    if (!firstPlacement) {
      continue;
    }
    const stackDom = stackDomOf(firstPlacement.block);
    const regionSource = stackDom.regions.get(item.region.id);
    const outerChainOf = (placement: Placement) => {
      const { ancestors } = stackDom.blocks[placement.block.index];
      const regionIndex = regionSource ? ancestors.indexOf(regionSource) : -1;
      return {
        outer: regionIndex < 0 ? ancestors : ancestors.slice(0, regionIndex),
        inner: regionIndex < 0 ? [] : ancestors.slice(regionIndex + 1),
      };
    };
    const regionParent = ensureChain(
      firstPlacement,
      stackCloneOf(firstPlacement),
      outerChainOf(firstPlacement).outer,
      flowClones,
    );
    // The columns are laid out here rather than by CSS multicol, which would
    // balance and break them by its own rules.
    const row = document.createElement('div');
    row.style.setProperty('display', 'flex');
    row.style.setProperty('align-items', 'flex-start');
    row.style.setProperty('column-gap', `${item.region.columnGap}px`);
    regionParent.appendChild(row);
    for (let column = 0; column < item.region.columnCount; column += 1) {
      const columnElement = document.createElement('div');
      columnElement.style.setProperty('flex', '1 1 0');
      columnElement.style.setProperty('min-width', '0');
      columnElement.style.setProperty('display', 'flow-root');
      row.appendChild(columnElement);
      const columnClones = new Map<StyledElement, StyledElement>();
      let previousInColumn: undefined | Placement = undefined;
      for (const placement of item.columns[column] ?? []) {
        const { outer, inner } = outerChainOf(placement);
        // The containers outside the region are shared by every column.
        ensureChain(placement, stackCloneOf(placement), outer, flowClones);
        const parent = ensureChain(
          placement,
          columnElement,
          inner,
          columnClones,
        );
        renderPlacement(placement, parent, columnClones, previousInColumn);
        previousInColumn = placement;
      }
    }
    previousFlow = undefined;
  }

  for (const [clone, { span, last, complete }] of tracks) {
    if (last < span.last || !complete) {
      markSplitTo(clone);
    }
  }

  return contentElement;
};
