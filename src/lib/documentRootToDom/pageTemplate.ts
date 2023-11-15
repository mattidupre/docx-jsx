import {
  ID_PREFIX,
  type Size,
  type PageMargin,
  type Margin,
  type LayoutType,
} from 'src/entities/primitives';
import { mathUnits } from 'src/utils';

type InnerNode = undefined | Node | NodeList;

type PageOptions = {
  layoutType: LayoutType;
  size: Size;
  margin: PageMargin;
  header?: InnerNode;
  content?: InnerNode;
  footer?: InnerNode;
  styleSheets?: Array<CSSStyleSheet>;
};

export class PageTemplate {
  public element: Element;

  private static baseStyleSheet: undefined | CSSStyleSheet;

  private styleSheets: ReadonlyArray<CSSStyleSheet>;

  private readonly pageSize: Size;

  private readonly pageEl: Element;
  private static pageClassName = `${ID_PREFIX}-page`;

  private readonly headerEl: Element;
  private static headerClassName = `${PageTemplate.pageClassName}__header`;

  private readonly contentEl: Element;
  private static contentClassName = `${PageTemplate.pageClassName}__content`;

  private readonly footerEl: Element;
  private static footerClassName = `${PageTemplate.pageClassName}__footer`;

  private cachedContentSize: undefined | Size;
  public get contentSize() {
    return this.cachedContentSize
      ? { ...this.cachedContentSize }
      : this.getContentSize();
  }

  constructor(options: PageOptions) {
    console.log(options.margin);

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
    this.pageEl.classList.add(PageTemplate.pageClassName);
    this.pageEl.setAttribute('style', PageTemplate.createCssVars(options));

    this.headerEl = document.createElement('div');
    this.headerEl.classList.add(PageTemplate.headerClassName);
    PageTemplate.appendInnerNodes(this.headerEl, options.header);
    this.pageEl.appendChild(this.headerEl);

    this.contentEl = document.createElement('div');
    this.contentEl.classList.add(PageTemplate.contentClassName);
    PageTemplate.appendInnerNodes(this.contentEl, options.content);
    this.pageEl.appendChild(this.contentEl);

    this.footerEl = document.createElement('div');
    this.footerEl.classList.add(PageTemplate.footerClassName);
    PageTemplate.appendInnerNodes(this.footerEl, options.footer);
    this.pageEl.appendChild(this.footerEl);

    this.element = PageTemplate.createRoot({
      innerEl: this.pageEl,
      styleSheets: this.styleSheets,
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

  public toPage({ content }: Pick<PageOptions, 'content'>) {
    const innerEl = this.pageEl.cloneNode(true) as Element;
    PageTemplate.appendInnerNodes(
      innerEl.querySelector(`.${PageTemplate.contentClassName}`)!,
      content,
    );
    return PageTemplate.createRoot({
      innerEl,
      styleSheets: this.styleSheets,
    });
  }

  private static createRoot({
    innerEl,
    styleSheets,
  }: {
    innerEl: Element;
    styleSheets: ReadonlyArray<CSSStyleSheet>;
  }) {
    const rootEl = document.createElement('div');
    rootEl.style.setProperty('break-inside', 'avoid');
    rootEl.style.setProperty('break-after', 'page');

    const shadowEl = rootEl.attachShadow({ mode: 'closed' });
    shadowEl.adoptedStyleSheets.push(...styleSheets);
    shadowEl.appendChild(innerEl);
    return rootEl;
  }

  private static appendInnerNodes(
    parentEl: Element,
    el: undefined | InnerNode,
  ) {
    if (!el) {
      return;
    }
    return parentEl.append(...('length' in el ? [...el] : [el]));
  }

  private static createCssVars({ size, margin }: PageOptions) {
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
