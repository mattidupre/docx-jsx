import { type Size, type Margin } from '../../entities/primitives.js';
import { findElementsDom } from '../../entities/tree.js';
import { mathUnits } from '../../utils/units.js';

type InnerNode = undefined | Node | NodeList;

export type PageTemplateOptions = {
  size: Size;
  margin: Margin;
  header?: InnerNode;
  content?: InnerNode;
  footer?: InnerNode;
  className?: string;
  styleSheets?: Array<CSSStyleSheet>;
};

export type CloneOptions = {
  content?: InnerNode;
};

export type ReplaceCountersOptions = {
  pageNumber: number;
  pageCount: number;
};

const appendNodes = (parentEl: Element, el: undefined | InnerNode) => {
  if (!el) {
    return;
  }
  return parentEl.append(...('length' in el ? [...el] : [el]));
};

const mapNodes = (
  el: undefined | InnerNode,
  callback: (node: Node) => void,
) => {
  if (el === undefined) {
    return undefined;
  }
  if (el instanceof Node) {
    return callback(el);
  }
  if (typeof el[Symbol.iterator] === 'function') {
    return Array.prototype.map.call(el, (thisEl) =>
      callback(thisEl),
    ) as unknown as NodeList;
  }
  throw new TypeError('Invalid element.');
};

const cloneNodes = (el: undefined | InnerNode, deep?: boolean): typeof el => {
  if (el === undefined) {
    return undefined;
  }
  if (el instanceof Node) {
    return el.cloneNode(deep);
  }
  if (typeof el[Symbol.iterator] === 'function') {
    return Array.prototype.map.call(el, (thisEl) =>
      thisEl.cloneNode(deep),
    ) as unknown as NodeList;
  }
  throw new TypeError('Invalid element.');
};

const setClassName = (
  innerNode: undefined | InnerNode,
  className?: string | Array<string>,
) => {
  if (!className) {
    return;
  }

  const classNames = (
    Array.isArray(className) ? className : [className]
  ).flatMap((cn) => cn.split(/\s+/));

  return mapNodes(innerNode, (node) => {
    for (const className of classNames) {
      if ('classList' in node && className) {
        (node as Element).classList.add(className);
      }
    }
  });
};

export class PageTemplate {
  private readonly options: PageTemplateOptions;

  public readonly element: Element;

  private static baseStyleSheet: undefined | CSSStyleSheet;

  private readonly styleSheets: ReadonlyArray<CSSStyleSheet>;

  private readonly pageSize: Size;

  public readonly pageEl: Element;
  public static readonly pageClassName = 'page';

  public readonly headerEl: Element;
  public static readonly headerClassName = `${PageTemplate.pageClassName}__header`;

  public readonly contentEl: Element;
  public static readonly contentClassName = `${PageTemplate.pageClassName}__content`;

  public readonly footerEl: Element;
  public static readonly footerClassName = `${PageTemplate.pageClassName}__footer`;

  private cachedContentSize: undefined | Size;
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
      // Don't preserve content.
      content: cloneNodes(options.header, false),
      footer: cloneNodes(options.footer, true),
    };
  }

  constructor({ content, ...options }: PageTemplateOptions) {
    this.options = PageTemplate.cloneOptions(options);

    // Memoize static creation of baseStyleSheet.
    if (!PageTemplate.baseStyleSheet) {
      PageTemplate.baseStyleSheet = new CSSStyleSheet();
      PageTemplate.baseStyleSheet.replaceSync(PageTemplate.innerStyle);
    }

    this.styleSheets = [
      PageTemplate.baseStyleSheet,
      ...(options.styleSheets ?? []),
    ];
    this.pageSize = { ...options.size };

    this.pageEl = document.createElement('div');
    setClassName(this.pageEl, PageTemplate.pageClassName);
    this.pageEl.setAttribute('style', PageTemplate.createCssVars(options));

    this.headerEl = document.createElement('div');
    setClassName(this.headerEl, PageTemplate.headerClassName);
    appendNodes(this.headerEl, options.header);
    this.pageEl.appendChild(this.headerEl);

    this.contentEl = document.createElement('div');
    setClassName(this.contentEl, PageTemplate.contentClassName);
    appendNodes(this.contentEl, content);
    this.pageEl.appendChild(this.contentEl);

    this.footerEl = document.createElement('div');
    setClassName(this.footerEl, PageTemplate.footerClassName);
    appendNodes(this.footerEl, options.footer);
    this.pageEl.appendChild(this.footerEl);

    this.element = PageTemplate.createRoot({
      innerEl: this.pageEl,
      styleSheets: this.styleSheets,
      className: options.className,
      size: options.size,
    });
  }

  public extend({ content }: CloneOptions) {
    return new PageTemplate({
      ...PageTemplate.cloneOptions(this.options),
      content,
    });
  }

  public getContentSize(): Size {
    if (!this.contentEl.isConnected) {
      throw new Error(
        'Cannot determine page content size if it is not attached to DOM.',
      );
    }

    const { width: pageWidth, height: pageHeight } =
      this.pageEl.getBoundingClientRect();

    if (pageWidth === 0 || pageHeight === 0) {
      throw new Error('Page must have dimensions.');
    }

    const style = window.getComputedStyle(this.contentEl, null);
    const contentWidth = parseInt(style.width, 10);
    const contentHeight = parseInt(style.height, 10);

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
    [this.headerEl, this.footerEl].forEach((headerFooterEl) => {
      headerFooterEl
        .querySelectorAll('[data-counter-type="page-number"]')
        .forEach((counterEl) => {
          counterEl.replaceWith(document.createTextNode(`${pageNumber}`));
        });

      headerFooterEl
        .querySelectorAll('[data-counter-type="page-count"]')
        .forEach((counterEl) => {
          counterEl.replaceWith(document.createTextNode(`${pageCount}`));
        });
    });
  }

  private static createRoot({
    innerEl,
    styleSheets,
    className,
    size,
  }: {
    innerEl: Element;
    styleSheets: ReadonlyArray<CSSStyleSheet>;
    className?: string;
    size: Size;
  }) {
    const rootEl = document.createElement('div');
    setClassName(rootEl, className);
    rootEl.style.setProperty('break-inside', 'avoid');
    rootEl.style.setProperty('break-after', 'page');
    rootEl.style.setProperty('width', size.width);
    rootEl.style.setProperty('height', size.height);

    const shadowEl = rootEl.attachShadow({ mode: 'closed' });
    shadowEl.adoptedStyleSheets.push(...styleSheets);
    shadowEl.appendChild(innerEl);
    return rootEl;
  }

  private static createCssVars({ size, margin }: PageTemplateOptions) {
    return `
      --page-width: ${size.width};
      --page-height: ${size.height};
      --page-margin-header: ${margin.header};
      --page-margin-top: ${margin.top};
      --page-margin-right: ${margin.right};
      --page-margin-bottom: ${margin.bottom};
      --page-margin-footer: ${margin.footer};
      --page-margin-left: ${margin.left};
    `;
  }

  private static innerStyle = `
    .${PageTemplate.pageClassName} {
      position: relative;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;

      width: var(--page-width);
      min-width: var(--page-width);
      max-width: var(--page-width);

      height: var(--page-height);
      min-height: var(--page-height);
      max-height: var(--page-height);

      padding-right: var(--page-margin-right);
      padding-left: var(--page-margin-left);
    }

    .${PageTemplate.headerClassName} {
      flex-shrink: 0;
    }

    :where(.${PageTemplate.headerClassName} > :first-child) {
      display: flow-root;
      margin-top: var(--page-margin-header);
    }

    .${PageTemplate.contentClassName} {
      display: block;
      position: relative;
      width: 100%;
      min-height: 0;
      flex-grow: 1;
      columns: auto;

      padding-top: var(--page-margin-top);
      padding-bottom: var(--page-margin-bottom);
    }

    .${PageTemplate.footerClassName} {
      flex-shrink: 0;
    }

    :where(.${PageTemplate.footerClassName} > :last-child) {
      display: flow-root;
      margin-bottom: var(--page-margin-header);
    }

    /* From PagedJS */

    .${PageTemplate.pageClassName} [data-split-from] {
      counter-increment: unset;
      counter-reset: unset;
    }

    .${PageTemplate.pageClassName} [data-split-to] {
      margin-bottom: unset;
      padding-bottom: unset;
    }

    .${PageTemplate.pageClassName} [data-split-from] {
      text-indent: unset;
      margin-top: unset;
      padding-top: unset;
      initial-letter: unset;
    }

    .${PageTemplate.pageClassName} [data-split-from] > *::first-letter,
    .${PageTemplate.pageClassName} [data-split-from]::first-letter {
      color: unset;
      font-size: unset;
      font-weight: unset;
      font-family: unset;
      color: unset;
      line-height: unset;
      float: unset;
      padding: unset;
      margin: unset;
    }

    .${PageTemplate.pageClassName} [data-split-to]:not([data-footnote-call]):after,
    .${PageTemplate.pageClassName} [data-split-to]:not([data-footnote-call])::after {
      content: unset;
    }

    .${PageTemplate.pageClassName} [data-split-from]:not([data-footnote-call]):before,
    .${PageTemplate.pageClassName} [data-split-from]:not([data-footnote-call])::before {
      content: unset;
    }

    .${PageTemplate.pageClassName} li[data-split-from]:first-of-type {
      list-style: none;
    }

    .${PageTemplate.pageClassName} [data-align-last-split-element='justify'] {
      text-align-last: justify;
    }
  `;
}
