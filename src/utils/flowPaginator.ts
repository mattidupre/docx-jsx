import { Pager, type PagerOptions, type PageVars, type ToPagesOptions } from './pager';

/**
 * SPIKE: a paginator that applies Word's pagination rules to the library's
 * block flow, behind the same `toPages` contract as {@link Pager}.
 *
 * Every stack is laid out once, unpaginated, at its page content width. Each
 * leaf block (a paragraph, a heading, a list item, or an atomic block such as a
 * table or a row) is measured there: its border box, its margins and the
 * boundaries of its line boxes. Pages are then filled by arithmetic on those
 * measurements, and only the chosen fragments are built into page DOM.
 *
 * Rules, as Word applies them:
 * - sibling margins collapse to the larger value;
 * - space-before is dropped at the top of a page or column that follows a
 *   natural break or a `Break`, and kept at the start of a stack;
 * - a paragraph never leaves one line alone at either side of a break
 *   (widow/orphan control, 2 lines);
 * - `break-after: avoid` keeps a block with the start of the next one, and
 *   `break-inside: avoid` keeps a block (or a group) whole;
 * - atomic blocks (tables, flex and grid rows) move whole;
 * - columns fill one after another and the last page of a column stack is
 *   balanced to the shortest height that holds what is left.
 */

/** Layout noise tolerated when comparing a height with the space left. */
const FIT_EPSILON_PX = 0.5;

const WIDOW_ORPHAN_LINES = 2;

const DESCENDED_DISPLAYS = new Set(['block', 'flow-root', 'list-item']);

type StartKind = 'stack' | 'break' | 'natural';

type StyledElement = HTMLElement | SVGElement;

const isStyledElement = (node: unknown): node is StyledElement =>
  node instanceof HTMLElement || node instanceof SVGElement;

type Region = {
  source: HTMLElement;
  columnCount: number;
  columnGap: number;
};

type Leaf = {
  source: StyledElement;
  measured: StyledElement;
  /** Body rows of a table leaf; its "lines" are rows. */
  rows: ReadonlyArray<HTMLTableRowElement>;
  /** Height repeated on every continuation (a table's header rows). */
  repeatHeight: number;
  /** Fewest lines allowed on either side of a split (widow/orphan). */
  minLines: number;
  stackIndex: number;
  region: undefined | Region;
  height: number;
  marginTop: number;
  marginBottom: number;
  /**
   * Line box boundaries relative to the border box top: `bounds[0]` is the top
   * of the first line box, `bounds[lineCount]` the bottom of the last.
   */
  bounds: ReadonlyArray<number>;
  lineCount: number;
  splittable: boolean;
  keepNext: boolean;
  breakBefore: undefined | 'stack' | 'page';
  columnBreakAfter: boolean;
  justified: boolean;
};

type Piece = { leaf: Leaf; from: number };

type Placement = {
  leaf: Leaf;
  from: number;
  to: number;
  dropMarginTop: boolean;
};

type FillResult = {
  placed: Array<Placement>;
  used: number;
  rest: Array<Piece>;
};

type PageItem =
  | { kind: 'flow'; placement: Placement }
  | { kind: 'region'; region: Region; columns: Array<Array<Placement>> };

type PageSize = { width: number; height: number };

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneShallow = <TElement extends StyledElement>(
  element: TElement,
): StyledElement => {
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

const textNodesOf = (root: Node): Array<Text> => {
  const texts: Array<Text> = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text) {
      texts.push(node);
    }
  }
  return texts;
};

/** Pairs every node of `source` with the node at the same place in `clone`. */
const pairNodes = (
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

const hasOwnText = (element: StyledElement): boolean =>
  Array.from(element.childNodes).some(
    (node) => node instanceof Text && node.data.trim().length > 0,
  );

const lineBoxesOf = (element: StyledElement): Array<{ top: number; bottom: number }> => {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.height > 0 && rect.width > 0)
    .sort((a, b) => a.top - b.top);
  const lines: Array<{ top: number; bottom: number }> = [];
  for (const rect of rects) {
    const last = lines.at(-1);
    if (last && rect.top < last.bottom - FIT_EPSILON_PX) {
      last.top = Math.min(last.top, rect.top);
      last.bottom = Math.max(last.bottom, rect.bottom);
    } else {
      lines.push({ top: rect.top, bottom: rect.bottom });
    }
  }
  return lines;
};

/**
 * The text position (index into the element's text nodes, and offset) of the
 * first character laid out at or below `boundary`, in client coordinates.
 */
const textPositionAt = (
  element: StyledElement,
  boundary: number,
): { textIndex: number; offset: number } => {
  const texts = textNodesOf(element);
  const starts: Array<number> = [];
  let total = 0;
  for (const text of texts) {
    starts.push(total);
    total += text.length;
  }
  const locate = (index: number) => {
    let textIndex = texts.length - 1;
    while (textIndex > 0 && starts[textIndex] > index) {
      textIndex -= 1;
    }
    return { textIndex, offset: index - starts[textIndex] };
  };
  const range = document.createRange();
  const charTop = (index: number): number => {
    for (let current = index; current < total; current += 1) {
      const { textIndex, offset } = locate(current);
      range.setStart(texts[textIndex], offset);
      range.setEnd(texts[textIndex], offset + 1);
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
  let high = total;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (charTop(middle) >= boundary) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return locate(Math.min(low, Math.max(total - 1, 0)));
};

export class FlowPaginator {
  readonly styleSheets: Array<CSSStyleSheet>;

  readonly styleElements: Array<HTMLStyleElement>;

  readonly vars: undefined | PageVars;

  constructor({ styles = [], vars }: PagerOptions = {}) {
    this.styleSheets = styles.filter(
      (style): style is CSSStyleSheet => style instanceof CSSStyleSheet,
    );
    this.styleElements = styles.filter(
      (style): style is HTMLStyleElement => style instanceof HTMLStyleElement,
    );
    this.vars = vars;
  }

  async toPages({
    content,
    vars,
    onPageStart,
    onPageBreak,
    onPageRendered,
    onPagesRendered,
  }: ToPagesOptions): Promise<void> {
    const hostElement = document.createElement('div');
    hostElement.style.setProperty('visibility', 'hidden');
    hostElement.style.setProperty('position', 'absolute');
    hostElement.style.setProperty('pointer-events', 'none');
    hostElement.style.setProperty('z-index', '-9999');
    document.body.appendChild(hostElement);
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });
    shadowRoot.adoptedStyleSheets.push(...this.styleSheets);
    shadowRoot.append(...this.styleElements.map((style) => style.cloneNode(true)));

    const baseVars: PageVars = {
      ...Pager.PAGE_OPTIONS_DEFAULTS,
      ...this.vars,
      ...vars,
    };

    const measurePageSize = (pageVars: PageVars): PageSize => {
      const merged = { ...baseVars, ...pageVars };
      const probe = document.createElement('div');
      probe.style.setProperty('position', 'absolute');
      probe.style.setProperty(
        'width',
        `calc(${merged.width} - ${merged.marginLeft} - ${merged.marginRight})`,
      );
      probe.style.setProperty(
        'height',
        `calc(${merged.height} - ${merged.marginTop} - ${merged.marginBottom})`,
      );
      shadowRoot.appendChild(probe);
      const { width, height } = probe.getBoundingClientRect();
      probe.remove();
      return { width, height };
    };

    const stackElements = Array.from(content.childNodes).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );

    const measureStack = (stackIndex: number, width: number): Array<Leaf> => {
      const stackSource = stackElements[stackIndex];
      const box = document.createElement('div');
      box.style.setProperty('width', `${width}px`);
      box.style.setProperty('display', 'flow-root');
      shadowRoot.appendChild(box);
      const stackMeasured = cloneDeep(stackSource);
      box.appendChild(stackMeasured);
      const pairs = pairNodes(stackSource, stackMeasured, new Map());
      const measuredOf = (source: StyledElement): StyledElement => {
        const measured = pairs.get(source);
        if (!isStyledElement(measured)) {
          throw new TypeError('Expected a measured element.');
        }
        return measured;
      };

      // A multi-column stack wraps its whole content in one multicol element.
      let region: undefined | Region = undefined;
      for (const element of stackSource.querySelectorAll('*')) {
        if (
          element instanceof HTMLElement &&
          Number.parseInt(element.style.columnCount, 10) > 1
        ) {
          const measured = measuredOf(element);
          const columnCount = Number.parseInt(element.style.columnCount, 10);
          const columnGap = toPx(getComputedStyle(measured).columnGap);
          region = { source: element, columnCount, columnGap };
          measured.style.setProperty('column-count', 'auto');
          measured.style.setProperty(
            'width',
            `${(width - columnGap * (columnCount - 1)) / columnCount}px`,
          );
          break;
        }
      }

      const leaves: Array<Leaf> = [];
      let pendingBreak: undefined | 'stack' | 'page' =
        stackSource.getAttribute('data-break-before') === 'page'
          ? 'stack'
          : undefined;

      const visit = (
        source: StyledElement,
        keepGroup: undefined | Array<Leaf>,
      ): void => {
        const measured = measuredOf(source);
        const style = getComputedStyle(measured);
        if (style.display === 'none') {
          return;
        }
        if (source.getAttribute('data-previous-break-after') === 'page') {
          pendingBreak ??= 'page';
        }
        const children = Array.from(source.children).filter(isStyledElement);
        // Scroll containers and float layouts (Grid) are monolithic, as they
        // are in Chrome's own fragmentation and as a `cantSplit` row is in Word.
        const descend =
          source instanceof HTMLElement &&
          (DESCENDED_DISPLAYS.has(style.display) || source === region?.source) &&
          style.overflowY === 'visible' &&
          children.length > 0 &&
          !hasOwnText(source) &&
          children.every((child) => {
            const childStyle = getComputedStyle(measuredOf(child));
            return (
              child instanceof HTMLElement &&
              DESCENDED_DISPLAYS.has(childStyle.display) &&
              childStyle.float === 'none'
            );
          });
        const groupsChildren =
          descend && style.breakInside === 'avoid' && keepGroup === undefined;
        if (descend) {
          const group: undefined | Array<Leaf> = groupsChildren ? [] : keepGroup;
          for (const child of children) {
            visit(child, group);
          }
          if (groupsChildren && group) {
            // Word's BreakAvoid: every paragraph keeps with the next, and the
            // group's last one only when the group itself avoids a break after.
            group.forEach((leaf, index) => {
              leaf.keepNext =
                index < group.length - 1 || style.breakAfter === 'avoid';
            });
          }
          return;
        }

        const rect = measured.getBoundingClientRect();
        const insetTop =
          toPx(style.borderTopWidth) + toPx(style.paddingTop);
        const insetBottom =
          toPx(style.borderBottomWidth) + toPx(style.paddingBottom);
        const keepLines = style.breakInside === 'avoid' || keepGroup !== undefined;
        const rows =
          source instanceof HTMLTableElement
            ? Array.from(source.tBodies).flatMap((body) => Array.from(body.rows))
            : [];
        const measuredHead =
          measured instanceof HTMLTableElement ? measured.tHead : null;
        const repeatHeight = measuredHead
          ? measuredHead.getBoundingClientRect().height
          : 0;
        const atomic = !DESCENDED_DISPLAYS.has(style.display);
        const lines = atomic ? [] : lineBoxesOf(measured);
        const bounds =
          rows.length > 1
            ? [
                ...rows.map(
                  (row) =>
                    measuredOf(row).getBoundingClientRect().top - rect.top,
                ),
                rect.height,
              ]
            : lines.length > 0
            ? [
                insetTop,
                ...lines
                  .slice(1)
                  .map(
                    (line, index) =>
                      (lines[index].bottom + line.top) / 2 - rect.top,
                  ),
                rect.height - insetBottom,
              ]
            : [0, rect.height];
        const leaf: Leaf = {
          source,
          measured,
          rows,
          repeatHeight,
          minLines: rows.length > 1 ? 1 : WIDOW_ORPHAN_LINES,
          stackIndex,
          region,
          height: rect.height,
          marginTop: toPx(style.marginTop),
          marginBottom: toPx(style.marginBottom),
          bounds,
          lineCount: bounds.length - 1,
          splittable:
            (rows.length > 1 || !atomic) && !keepLines && bounds.length - 1 >= 2,
          keepNext: style.breakAfter === 'avoid',
          breakBefore: pendingBreak,
          columnBreakAfter: style.breakAfter === 'column',
          justified: style.textAlign === 'justify',
        };
        pendingBreak = undefined;
        keepGroup?.push(leaf);
        leaves.push(leaf);
      };

      for (const child of Array.from(stackSource.children)) {
        if (isStyledElement(child)) {
          visit(child, undefined);
        }
      }
      return leaves;
    };

    const pieceHeight = (leaf: Leaf, from: number, to: number): number =>
      (to === leaf.lineCount ? leaf.height : leaf.bounds[to]) -
      (from === 0 ? 0 : leaf.bounds[from] - leaf.repeatHeight);

    /**
     * Fills one box (a page, or one column) of `height` from the front of
     * `queue`. `dropFirstMargin` is Word's space-before truncation.
     */
    const fill = (
      queue: ReadonlyArray<Piece>,
      height: number,
      dropFirstMargin: boolean,
      isColumn: boolean,
      mustProgress: boolean,
    ): FillResult => {
      const placed: Array<Placement> = [];
      let used = 0;
      let previousMarginBottom = 0;
      let index = 0;
      const stopWith = (rest: Array<Piece>): FillResult => ({
        placed,
        used,
        rest,
      });
      while (index < queue.length) {
        const { leaf, from } = queue[index];
        const last = placed.at(-1);
        if (last && from === 0 && leaf.breakBefore) {
          return stopWith(queue.slice(index));
        }
        if (isColumn && last?.leaf.columnBreakAfter) {
          return stopWith(queue.slice(index));
        }
        const dropMarginTop = from > 0 || (!last && dropFirstMargin);
        const marginTop = dropMarginTop ? 0 : leaf.marginTop;
        const top = last ? used + Math.max(previousMarginBottom, marginTop) : marginTop;
        const whole = pieceHeight(leaf, from, leaf.lineCount);
        if (top + whole <= height + FIT_EPSILON_PX) {
          placed.push({ leaf, from, to: leaf.lineCount, dropMarginTop });
          used = top + whole;
          previousMarginBottom = leaf.marginBottom;
          index += 1;
          continue;
        }

        let to = from;
        if (leaf.splittable) {
          while (
            to + 1 < leaf.lineCount &&
            top + pieceHeight(leaf, from, to + 1) <= height + FIT_EPSILON_PX
          ) {
            to += 1;
          }
          if (leaf.lineCount - to < leaf.minLines) {
            to = leaf.lineCount - leaf.minLines;
          }
          if (from === 0 && to < leaf.minLines) {
            to = 0;
          }
          to = Math.max(to, from);
        }
        if (to > from) {
          placed.push({ leaf, from, to, dropMarginTop });
          used = top + pieceHeight(leaf, from, to);
          return stopWith([{ leaf, from: to }, ...queue.slice(index + 1)]);
        }

        if (!last) {
          if (!mustProgress) {
            return stopWith(queue.slice(index));
          }
          // Nothing fits in an empty box: place what fits, or all of it.
          let forced = leaf.splittable ? from : leaf.lineCount - 1;
          while (
            forced + 1 < leaf.lineCount &&
            top + pieceHeight(leaf, from, forced + 1) <= height + FIT_EPSILON_PX
          ) {
            forced += 1;
          }
          forced = Math.max(forced, from + 1);
          placed.push({ leaf, from, to: forced, dropMarginTop });
          used = top + pieceHeight(leaf, from, forced);
          return stopWith(
            forced < leaf.lineCount
              ? [{ leaf, from: forced }, ...queue.slice(index + 1)]
              : queue.slice(index + 1),
          );
        }

        // Move a trailing keep-with-next chain along with this block.
        let chainStart = placed.length;
        while (
          chainStart > 0 &&
          placed[chainStart - 1].leaf.keepNext &&
          placed[chainStart - 1].from === 0 &&
          placed[chainStart - 1].to === placed[chainStart - 1].leaf.lineCount
        ) {
          chainStart -= 1;
        }
        if (chainStart > 0 && chainStart < placed.length) {
          const moved = placed
            .splice(chainStart)
            .map(({ leaf: movedLeaf }) => ({ leaf: movedLeaf, from: 0 }));
          return stopWith([...moved, ...queue.slice(index)]);
        }
        return stopWith(queue.slice(index));
      };
      return stopWith([]);
    };

    const fillColumns = (
      queue: ReadonlyArray<Piece>,
      region: Region,
      height: number,
      dropFirstMargin: boolean,
      mustProgress: boolean,
    ) => {
      const columns: Array<Array<Placement>> = [];
      let rest: ReadonlyArray<Piece> = queue;
      let used = 0;
      for (let column = 0; column < region.columnCount && rest.length > 0; column += 1) {
        const result = fill(
          rest,
          height,
          column === 0 ? dropFirstMargin : true,
          true,
          mustProgress && column === 0,
        );
        columns.push(result.placed);
        used = Math.max(used, result.used);
        rest = result.rest;
      }
      return { columns, used, rest };
    };

    // Page loop.
    const pages: Array<Array<PageItem>> = [];
    let queue: Array<Piece> = [];
    let startKind: StartKind = 'stack';
    let pageIndex = 0;
    let measuredStackCount = 0;

    const startPage = (): PageSize => {
      let size: undefined | PageSize = undefined;
      onPageStart?.({
        pageIndex,
        setPageVars: (pageVars) => {
          size = measurePageSize(pageVars);
        },
      });
      return size ?? measurePageSize({});
    };

    let size = startPage();
    const loadStack = (width: number) => {
      queue.push(
        ...measureStack(measuredStackCount, width).map((leaf) => ({
          leaf,
          from: 0,
        })),
      );
      measuredStackCount += 1;
    };
    loadStack(size.width);

    let items: Array<PageItem> = [];
    let used = 0;

    const finishPage = (next: undefined | Piece) => {
      pages.push(items);
      if (next) {
        const { source } = next.leaf;
        // An SVG leaf is reported through the HTML element that holds it.
        const sourceElement =
          source instanceof HTMLElement ? source : source.parentElement;
        const breakElement =
          next.from === 0 && sourceElement
            ? sourceElement
            : next.leaf.rows[next.from] ??
              textNodesOf(next.leaf.source)[
                textPositionAt(
                  next.leaf.measured,
                  next.leaf.measured.getBoundingClientRect().top +
                    next.leaf.bounds[next.from],
                ).textIndex
              ];
        onPageBreak?.({ breakElement, pageIndex });
      }
      pageIndex += 1;
      items = [];
      used = 0;
    };

    while (queue.length > 0 || measuredStackCount < stackElements.length) {
      if (queue.length === 0) {
        // The next stack: a continuous one joins this page, any other one
        // starts a page of its own.
        const nextStack = stackElements[measuredStackCount];
        if (nextStack.getAttribute('data-break-before') === 'page') {
          // Its first leaf is not known before measuring; measure at the
          // width of the page it will start.
          const probeQueue = measureStack(measuredStackCount, size.width);
          const first = probeQueue.at(0);
          measuredStackCount += 1;
          if (items.length > 0 && first) {
            finishPage({ leaf: first, from: 0 });
            size = startPage();
            startKind = 'stack';
          }
          queue.push(...probeQueue.map((leaf) => ({ leaf, from: 0 })));
          continue;
        }
        loadStack(size.width);
        continue;
      }

      const region = queue[0].leaf.region;
      const dropFirstMargin = items.length === 0 && startKind !== 'stack';
      if (region) {
        const regionEnd = queue.findIndex((piece) => piece.leaf.region !== region);
        const regionQueue = regionEnd < 0 ? queue : queue.slice(0, regionEnd);
        const others = regionEnd < 0 ? [] : queue.slice(regionEnd);
        const available = size.height - used;
        let result = fillColumns(
          regionQueue,
          region,
          available,
          dropFirstMargin,
          items.length === 0,
        );
        if (result.rest.length === 0) {
          // Last page of the columns: balance them.
          let low = 0;
          let high = available;
          while (high - low > FIT_EPSILON_PX / 2) {
            const middle = (low + high) / 2;
            if (
              fillColumns(regionQueue, region, middle, dropFirstMargin, false)
                .rest.length === 0
            ) {
              high = middle;
            } else {
              low = middle;
            }
          }
          result = fillColumns(regionQueue, region, high, dropFirstMargin, false);
        }
        items.push({ kind: 'region', region, columns: result.columns });
        used += result.used;
        queue = [...result.rest, ...others];
        if (result.rest.length > 0) {
          finishPage(result.rest[0]);
          size = startPage();
          startKind = 'natural';
        }
        continue;
      }

      const flowEnd = queue.findIndex((piece) => piece.leaf.region !== undefined);
      const flowQueue = flowEnd < 0 ? queue : queue.slice(0, flowEnd);
      const following = flowEnd < 0 ? [] : queue.slice(flowEnd);
      const result = fill(
        flowQueue,
        size.height - used,
        dropFirstMargin,
        false,
        items.length === 0,
      );
      for (const placement of result.placed) {
        items.push({ kind: 'flow', placement });
      }
      used += result.used;
      queue = [...result.rest, ...following];
      if (result.rest.length > 0) {
        const next = result.rest[0];
        finishPage(next);
        size = startPage();
        startKind =
          next.from === 0 && next.leaf.breakBefore === 'stack'
            ? 'stack'
            : next.from === 0 && next.leaf.breakBefore === 'page'
              ? 'break'
              : 'natural';
      }
    }
    if (items.length > 0) {
      pages.push(items);
    }

    // Build the page DOM from the placements.
    pages.forEach((pageItems, index) => {
      const contentElement = document.createElement('div');
      const clones = new Map<StyledElement, StyledElement>();

      const ensureParent = (
        leaf: Leaf,
        columnClones: undefined | Map<StyledElement, StyledElement>,
      ): StyledElement => {
        const stackSource = stackElements[leaf.stackIndex];
        const chain: Array<StyledElement> = [];
        for (
          let current = leaf.source.parentElement;
          current && current !== stackSource;
          current = current.parentElement
        ) {
          if (leaf.region && current === leaf.region.source) {
            break;
          }
          chain.unshift(current);
        }
        let parent = clones.get(stackSource);
        if (!parent) {
          parent = cloneShallow(stackSource);
          clones.set(stackSource, parent);
          contentElement.appendChild(parent);
        }
        const map = columnClones ?? clones;
        if (columnClones) {
          const columnParent = columnClones.get(stackSource);
          if (columnParent) {
            parent = columnParent;
          }
        }
        for (const ancestor of chain) {
          let clone = map.get(ancestor);
          if (!clone) {
            clone = cloneShallow(ancestor);
            if (ancestor instanceof HTMLOListElement) {
              const firstItem = leaf.source.closest('li');
              const items = Array.from(ancestor.children).filter(
                (child) => child instanceof HTMLLIElement,
              );
              const itemIndex = firstItem ? items.indexOf(firstItem) : -1;
              if (itemIndex > 0) {
                clone.setAttribute('start', String(ancestor.start + itemIndex));
              }
            }
            map.set(ancestor, clone);
            parent.appendChild(clone);
          }
          parent = clone;
        }
        return parent;
      };

      const renderPlacement = (
        placement: Placement,
        columnClones: undefined | Map<StyledElement, StyledElement>,
        isFirstInBox: boolean,
      ) => {
        const { leaf, from, to } = placement;
        const parent = ensureParent(leaf, columnClones);
        let element: StyledElement;
        if (from === 0 && to === leaf.lineCount) {
          element = cloneDeep(leaf.source);
        } else if (leaf.rows.length > 1) {
          // A table piece: its header (repeated), then rows [from, to).
          element = cloneShallow(leaf.source);
          for (const child of Array.from(leaf.source.children)) {
            if (child instanceof HTMLTableSectionElement && child.tagName === 'TBODY') {
              continue;
            }
            if (from > 0 && child instanceof HTMLTableCaptionElement) {
              continue;
            }
            if (isStyledElement(child)) {
              element.appendChild(cloneDeep(child));
            }
          }
          const bodies = new Map<Element, StyledElement>();
          for (const row of leaf.rows.slice(from, to)) {
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
            bodyClone.appendChild(cloneDeep(row));
          }
          if (to < leaf.lineCount) {
            element.style.setProperty('margin-bottom', '0');
          }
        } else {
          const measuredTop = leaf.measured.getBoundingClientRect().top;
          const texts = textNodesOf(leaf.source);
          const range = document.createRange();
          if (from === 0) {
            range.setStart(leaf.source, 0);
          } else {
            const start = textPositionAt(leaf.measured, measuredTop + leaf.bounds[from]);
            range.setStart(texts[start.textIndex], start.offset);
          }
          if (to === leaf.lineCount) {
            range.setEnd(leaf.source, leaf.source.childNodes.length);
          } else {
            const end = textPositionAt(leaf.measured, measuredTop + leaf.bounds[to]);
            range.setEnd(texts[end.textIndex], end.offset);
          }
          element = cloneShallow(leaf.source);
          element.appendChild(range.cloneContents());
          if (from > 0) {
            element.style.setProperty('padding-top', '0');
            element.style.setProperty('border-top-width', '0');
            element.style.setProperty('text-indent', '0');
          }
          if (to < leaf.lineCount) {
            element.style.setProperty('margin-bottom', '0');
            element.style.setProperty('padding-bottom', '0');
            element.style.setProperty('border-bottom-width', '0');
            if (leaf.justified) {
              element.style.setProperty('text-align-last', 'justify');
            }
          }
        }
        if (placement.dropMarginTop || (isFirstInBox && from > 0)) {
          element.style.setProperty('margin-top', '0');
        }
        parent.appendChild(element);
      };

      for (const item of pageItems) {
        if (item.kind === 'flow') {
          renderPlacement(item.placement, undefined, false);
          continue;
        }
        const { region, columns } = item;
        const firstLeaf = columns.at(0)?.at(0)?.leaf;
        if (!firstLeaf) {
          continue;
        }
        const regionParent = ensureParent(
          { ...firstLeaf, region: undefined, source: region.source },
          undefined,
        );
        const row = document.createElement('div');
        row.style.setProperty('display', 'flex');
        row.style.setProperty('align-items', 'flex-start');
        row.style.setProperty('column-gap', `${region.columnGap}px`);
        regionParent.appendChild(row);
        for (let column = 0; column < region.columnCount; column += 1) {
          const columnEl = document.createElement('div');
          columnEl.style.setProperty('flex', '1 1 0');
          columnEl.style.setProperty('min-width', '0');
          columnEl.style.setProperty('display', 'flow-root');
          row.appendChild(columnEl);
          const columnClones = new Map<StyledElement, StyledElement>([
            [stackElements[firstLeaf.stackIndex], columnEl],
          ]);
          (columns[column] ?? []).forEach((placement, placementIndex) => {
            renderPlacement(placement, columnClones, placementIndex === 0);
          });
        }
      }

      onPageRendered?.({
        pageElement: contentElement,
        contentElement,
        pageIndex: index,
      });
    });

    onPagesRendered?.({ pagesElement: document.createElement('div') });

    hostElement.remove();
  }
}
