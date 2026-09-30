import { mapValues } from 'lodash';
import {
  PAGE_CLASS_NAMES,
  PAGE_VARS,
  mathUnits,
  resolveRemSize,
  selectDomElement,
} from '../../entities';
import type { PageSize, PageMargin, PrefixesConfig } from '../../entities';
import { applyDataAttributes } from '../../utils/dataAttributes';
import {
  PAGE_ELEMENT_TAG_NAME,
  PAGE_SLOTS,
  definePageElement,
  type PageElement,
} from './pageElement';

/**
 * The content of one page area: a single node, or a collection of them as
 * `querySelectorAll` returns it.
 */
type InnerNode = undefined | Node | ReadonlyArray<Node> | NodeList;

export type PageTemplateOptions = {
  prefixes: PrefixesConfig;
  size: PageSize;
  margin: PageMargin;
  header?: InnerNode;
  content?: InnerNode;
  footer?: InnerNode;
  outerClassName?: string;
  innerClassName?: string;
  outerDataAttributes?: Record<`data-${string}`, string>;
  innerDataAttributes?: Record<`data-${string}`, string>;
  /** The stylesheets of the page element's shadow root, its chrome. */
  shadowStyleSheets?: ReadonlyArray<CSSStyleSheet>;
};

export type CloneOptions = {
  content?: InnerNode;
};

export type ReplaceCountersOptions = {
  pageNumber: number;
  pageCount: number;
};

const toNodes = (el: Exclude<InnerNode, undefined>): ReadonlyArray<Node> => {
  if (el instanceof Node) {
    return [el];
  }
  if (typeof el[Symbol.iterator] === 'function') {
    return Array.from(el);
  }
  throw new TypeError('Invalid element.');
};

/**
 * Appends `el` to a page element, into the slot named `slotName` (the default
 * slot when there is none). Only an element can name a slot, so a stray text
 * node is wrapped in a `<span>` that does.
 */
const appendToSlot = (
  pageElement: PageElement,
  el: InnerNode,
  slotName: undefined | string,
): ReadonlyArray<Node> => {
  if (!el) {
    return [];
  }
  const nodes = toNodes(el).map((node) => {
    if (!slotName || node instanceof Element) {
      return node;
    }
    const wrapper = pageElement.ownerDocument.createElement('span');
    wrapper.append(node);
    return wrapper;
  });
  for (const node of nodes) {
    if (slotName && node instanceof Element) {
      node.setAttribute('slot', slotName);
    }
  }
  pageElement.append(...nodes);
  return nodes;
};

const mapNodes = (el: InnerNode, callback: (node: Node) => void): void => {
  if (el === undefined) {
    return;
  }
  for (const node of toNodes(el)) {
    callback(node);
  }
};

const cloneNodes = (el: InnerNode, deep?: boolean): InnerNode => {
  if (el === undefined) {
    return undefined;
  }
  if (el instanceof Node) {
    return el.cloneNode(deep);
  }
  return toNodes(el).map((node) => node.cloneNode(deep));
};

const setClassName = (
  innerNode: InnerNode,
  className?: string | Array<string>,
) => {
  if (!className) {
    return;
  }

  const classNames = (
    Array.isArray(className) ? className : [className]
  ).flatMap((cn) => cn.split(/\s+/));

  mapNodes(innerNode, (node) => {
    for (const className of classNames) {
      if (node instanceof Element && className) {
        node.classList.add(className);
      }
    }
  });
};

export class PageTemplate {
  private readonly options: PageTemplateOptions;

  /** The `<matti-docs-page>` element of this page. */
  public readonly element: PageElement;

  private readonly pageSize: PageSize;

  /**
   * The class on {@link PageTemplate.element}. Every page stylesheet is scoped
   * to it, so it is also what a consumer's own stylesheet uses to reach a
   * rendered page. The `matti-docs` prefix is deliberate rather than derived
   * from `prefixes`: the scope selector appears in a shared, memoized
   * stylesheet, so it has to be the same for every document on the page.
   */
  public static readonly rootClassName = PAGE_CLASS_NAMES.name('pageRoot');

  public static readonly pageClassName = PAGE_CLASS_NAMES.name('page');

  /** The header and footer nodes, which carry the page counters. */
  private readonly counterNodes: ReadonlyArray<Node>;

  private cachedContentSize: undefined | PageSize;
  public get contentSize() {
    return this.cachedContentSize
      ? { ...this.cachedContentSize }
      : this.getContentSize();
  }

  private static cloneOptions(
    options: PageTemplateOptions,
  ): PageTemplateOptions {
    return {
      ...options,
      header: cloneNodes(options.header, true),
      // Shallow, so a template carries the content container but never the
      // content of the page it was cloned from.
      content: cloneNodes(options.content, false),
      footer: cloneNodes(options.footer, true),
    };
  }

  constructor({ content, ...unresolvedOptions }: PageTemplateOptions) {
    // The page box is laid out by the browser, which would resolve a `rem`
    // against the host page rather than the root font size the DOCX target
    // uses.
    const options: Omit<PageTemplateOptions, 'content'> = {
      ...unresolvedOptions,
      size: mapValues(unresolvedOptions.size, resolveRemSize),
      margin: mapValues(unresolvedOptions.margin, resolveRemSize),
    };

    this.options = PageTemplate.cloneOptions(options);

    this.pageSize = { ...options.size };

    definePageElement();
    this.element = document.createElement(PAGE_ELEMENT_TAG_NAME);
    this.element.adoptShadowStyleSheets(options.shadowStyleSheets ?? []);

    // The inner and outer page options used to name two nested elements; the
    // page element is both now.
    setClassName(
      this.element,
      [
        options.outerClassName ?? [],
        options.innerClassName ?? [],
        PageTemplate.rootClassName,
        PAGE_CLASS_NAMES.name('contentRoot'),
        PageTemplate.pageClassName,
      ].flat(),
    );
    applyDataAttributes(this.element, options.outerDataAttributes);
    applyDataAttributes(this.element, options.innerDataAttributes);

    this.element.style.setProperty('break-inside', 'avoid');
    this.element.style.setProperty('break-after', 'page');
    this.element.style.setProperty('width', options.size.width);
    this.element.style.setProperty('height', options.size.height);
    PAGE_VARS.applyCssVarsToElement(
      {
        width: options.size.width,
        height: options.size.height,
        marginHeader: options.margin.header,
        marginTop: options.margin.top,
        marginRight: options.margin.right,
        marginBottom: options.margin.bottom,
        marginFooter: options.margin.footer,
        marginLeft: options.margin.left,
      },
      this.element,
    );

    // Appended in reading order: slots decide where a node is drawn, but the
    // light DOM order is what a screen reader, the tab order and a copied
    // selection follow.
    const headerNodes = appendToSlot(
      this.element,
      options.header,
      PAGE_SLOTS.header,
    );
    appendToSlot(this.element, content, PAGE_SLOTS.content);
    const footerNodes = appendToSlot(
      this.element,
      options.footer,
      PAGE_SLOTS.footer,
    );
    this.counterNodes = [...headerNodes, ...footerNodes];
  }

  public extend(options: CloneOptions) {
    return new PageTemplate({
      ...PageTemplate.cloneOptions(this.options),
      ...options,
    });
  }

  public getContentSize(): PageSize {
    if (!this.element.isConnected) {
      throw new Error(
        'Cannot determine page content size if it is not attached to DOM.',
      );
    }

    const { pageWidth, pageHeight, contentWidth, contentHeight } =
      this.element.measureContent();

    if (pageWidth === 0 || pageHeight === 0) {
      throw new Error('Page must have dimensions.');
    }

    if (!(contentWidth > 0 && contentHeight > 0)) {
      throw new Error('Content must have dimensions.');
    }

    this.cachedContentSize = {
      width: mathUnits(
        'multiply',
        this.pageSize.width,
        contentWidth / pageWidth,
      ),
      height: mathUnits(
        'multiply',
        this.pageSize.height,
        contentHeight / pageHeight,
      ),
    };

    return this.contentSize;
  }

  public replaceCounters({ pageNumber, pageCount }: ReplaceCountersOptions) {
    for (const node of this.counterNodes) {
      if (!(node instanceof Element)) {
        continue;
      }
      selectDomElement(node, 'pagenumber').forEach((counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageNumber}`));
      });
      selectDomElement(node, 'pagecount').forEach((counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageCount}`));
      });
    }
  }
}
