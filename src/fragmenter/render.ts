import { unitCountOf, type PlacedPage, type Placement } from './model';
import {
  isStyledElement,
  type ContainerSpan,
  type DomBlock,
  type MeasuredStackDom,
  type RowSliceGeometry,
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
 * One slice of a row that is cut: every cell shows `[top, bottom)` of its
 * content through a clipping box, so the row is drawn across two pages with
 * no line cut in half.
 */
const sliceRow = (
  row: HTMLTableRowElement,
  top: number,
  bottom: undefined | number,
  geometry: RowSliceGeometry,
): StyledElement => {
  const rowClone = cloneShallow(row);
  rowClone.style.removeProperty('height');
  const sliceHeight = (bottom ?? geometry.height) - top;
  Array.from(row.children).forEach((cell, cellIndex) => {
    if (!isStyledElement(cell)) {
      return;
    }
    const padding = geometry.cellPaddings[cellIndex] ?? { top: 0, bottom: 0 };
    const cellClone = cloneShallow(cell);
    cellClone.style.setProperty('padding-top', '0');
    cellClone.style.setProperty('padding-bottom', '0');
    cellClone.style.setProperty('vertical-align', 'top');
    const viewport = document.createElement('div');
    viewport.style.setProperty('overflow', 'hidden');
    viewport.style.setProperty('height', `${sliceHeight}px`);
    const inner = document.createElement('div');
    inner.style.setProperty('display', 'flow-root');
    inner.style.setProperty('margin-top', `${-top}px`);
    inner.style.setProperty('padding-top', `${padding.top}px`);
    inner.style.setProperty('padding-bottom', `${padding.bottom}px`);
    inner.append(
      ...Array.from(cell.childNodes, (node) => node.cloneNode(true)),
    );
    viewport.appendChild(inner);
    cellClone.appendChild(viewport);
    rowClone.appendChild(cellClone);
  });
  if (top > 0) {
    rowClone.setAttribute(SPLIT_FROM_ATTRIBUTE, '');
  }
  if (bottom !== undefined) {
    rowClone.setAttribute(SPLIT_TO_ATTRIBUTE, '');
  }
  return rowClone;
};

/** Rows (or row slices) `[from, to)` of a table, under its kept sections. */
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
  const lastRow = end && end.offset > 0 ? endRow : endRow - 1;
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
    const top = rowIndex === startRow ? start.offset : 0;
    const bottom = end && rowIndex === endRow ? end.offset : undefined;
    const geometry = dom.rowSlices.get(row);
    bodyClone.appendChild(
      geometry && (top > 0 || bottom !== undefined)
        ? sliceRow(row, top, bottom, geometry)
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

type Track = { span: ContainerSpan; last: number; complete: boolean };

/**
 * Builds the content of one page. `stackDomOf` returns the measurement the
 * page's placements were made from.
 */
export const renderPage = (
  page: PlacedPage,
  stackDomOf: (stackIndex: number) => MeasuredStackDom,
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
    const stackDom = stackDomOf(stackIndex);
    let clone = stackClones.get(stackIndex);
    if (!clone) {
      clone = cloneShallow(stackDom.source);
      if (placement.block.index > 0 || placement.from > 0) {
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
    const stackDom = stackDomOf(placement.block.stackIndex);
    const dom = stackDom.blocks[placement.block.index];
    let parent = root;
    for (const ancestor of chain) {
      const span = stackDom.containers.get(ancestor);
      let clone = map.get(ancestor);
      if (!clone) {
        clone = cloneShallow(ancestor);
        if (
          span &&
          (span.first < placement.block.index || placement.from > 0)
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
    const stackDom = stackDomOf(block.stackIndex);
    const dom = stackDom.blocks[block.index];
    const unitCount = unitCountOf(block);
    let element: StyledElement;
    if ((from === 0 && to === unitCount) || block.kind === 'atomic') {
      element = cloneDeep(dom.source);
    } else if (block.kind === 'table') {
      element = renderTablePiece(dom, placement);
    } else {
      element = renderTextPiece(dom, placement);
    }
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

    if (from > 0) {
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
    const cloneOf = (stackIndex: number, marginElement: StyledElement) =>
      marginElement === stackDomOf(stackIndex).source
        ? stackClones.get(stackIndex)
        : (map.get(marginElement) ?? flowClones.get(marginElement));
    if (previous) {
      const previousDom = stackDomOf(previous.block.stackIndex).blocks[
        previous.block.index
      ];
      for (const marginElement of previousDom.bottomMarginElements) {
        cloneOf(previous.block.stackIndex, marginElement)?.style.setProperty(
          'margin-bottom',
          '0',
        );
      }
    }
    dom.topMarginElements.forEach((marginElement, index) => {
      const clone = cloneOf(block.stackIndex, marginElement);
      clone?.style.setProperty(
        'margin-top',
        index === 0 ? `${placement.marginTop}px` : '0',
      );
    });
  };

  let previousFlow: undefined | Placement = undefined;
  for (const item of page.items) {
    if (item.kind === 'flow') {
      const { placement } = item;
      const dom = stackDomOf(placement.block.stackIndex).blocks[
        placement.block.index
      ];
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
    const stackDom = stackDomOf(firstPlacement.block.stackIndex);
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
