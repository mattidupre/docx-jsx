import { ID_PREFIX } from 'src/entities/config';
import {
  type PageSize,
  type PageMargins,
  type PageType,
} from 'src/entities/options';
import { mathUnits } from 'src/utils';

type InnerNode = undefined | Node | NodeList;

type PageOptions = {
  pageType: PageType;
  pageSize: PageSize;
  margins: PageMargins;
  header?: InnerNode;
  content?: InnerNode;
  footer?: InnerNode;
  styleSheets?: Array<CSSStyleSheet>;
};

export class PageLayout {
  public element: Element;

  private static baseStyleSheet: undefined | CSSStyleSheet;

  private styleSheets: ReadonlyArray<CSSStyleSheet>;

  private readonly pageSize: PageSize;

  private readonly pageEl: Element;
  private static pageClassName = `${ID_PREFIX}-page`;

  private readonly headerEl: Element;
  private static headerClassName = `${PageLayout.pageClassName}__header`;

  private readonly contentEl: Element;
  private static contentClassName = `${PageLayout.pageClassName}__content`;

  private readonly footerEl: Element;
  private static footerClassName = `${PageLayout.pageClassName}__footer`;

  constructor(options: PageOptions) {
    if (!PageLayout.baseStyleSheet) {
      PageLayout.baseStyleSheet = new CSSStyleSheet();
      PageLayout.baseStyleSheet.replaceSync(PageLayout.innerStyle);
    }

    this.styleSheets = [
      PageLayout.baseStyleSheet,
      ...(options.styleSheets ?? []),
    ];
    this.pageSize = { ...options.pageSize };

    this.pageEl = document.createElement('div');
    this.pageEl.classList.add(PageLayout.pageClassName);
    this.pageEl.setAttribute('style', PageLayout.createCssVars(options));

    this.headerEl = document.createElement('div');
    this.headerEl.classList.add(PageLayout.headerClassName);
    PageLayout.appendInnerNodes(this.headerEl, options.header);
    this.pageEl.appendChild(this.headerEl);

    this.contentEl = document.createElement('div');
    this.contentEl.classList.add(PageLayout.contentClassName);
    PageLayout.appendInnerNodes(this.contentEl, options.content);
    this.pageEl.appendChild(this.contentEl);

    this.footerEl = document.createElement('div');
    this.footerEl.classList.add(PageLayout.footerClassName);
    PageLayout.appendInnerNodes(this.footerEl, options.footer);
    this.pageEl.appendChild(this.footerEl);

    this.element = PageLayout.createRoot({
      innerEl: this.pageEl,
      styleSheets: this.styleSheets,
    });
  }

  public getContentSize(): PageSize {
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

    const { width: contentWidth, height: contentHeight } =
      this.contentEl.getBoundingClientRect();

    if (contentWidth === 0 || contentHeight === 0) {
      throw new Error('Content must have dimensions.');
    }

    return {
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
  }

  public toPage({ content }: Pick<PageOptions, 'content'>) {
    const innerEl = this.pageEl.cloneNode(true) as Element;
    PageLayout.appendInnerNodes(
      innerEl.querySelector(`.${PageLayout.contentClassName}`)!,
      content,
    );
    return PageLayout.createRoot({
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

  private static createCssVars({
    pageSize: size,
    margins,
  }: Pick<PageOptions, 'pageSize' | 'margins'>) {
    return `
      --page-width: ${size.width};
      --page-height: ${size.height};
      --page-margin-top: ${margins.marginTop};
      --page-margin-right: ${margins.marginRight};
      --page-margin-bottom: ${margins.marginBottom};
      --page-margin-left: ${margins.marginLeft};
    `;
  }

  private static innerStyle = `
    .${PageLayout.pageClassName} {
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

      padding-top: var(--page-margin-top);
      padding-right: var(--page-margin-right);
      padding-bottom: var(--page-margin-bottom);
      padding-left: var(--page-margin-left);
    }

    .${PageLayout.headerClassName} {
      flex-shrink: 0;
    }

    .${PageLayout.contentClassName} {
      display: block;
      position: relative;
      width: 100%;
      min-height: 0;
      flex-grow: 1;
      columns: auto;
    }

    .${PageLayout.footerClassName} {
      flex-shrink: 0;
    }

    /* From PagedJS */

    .${PageLayout.pageClassName} [data-split-from] {
      counter-increment: unset;
      counter-reset: unset;
    }

    .${PageLayout.pageClassName} [data-split-to] {
      margin-bottom: unset;
      padding-bottom: unset;
    }

    .${PageLayout.pageClassName} [data-split-from] {
      text-indent: unset;
      margin-top: unset;
      padding-top: unset;
      initial-letter: unset;
    }

    .${PageLayout.pageClassName} [data-split-from] > *::first-letter,
    .${PageLayout.pageClassName} [data-split-from]::first-letter {
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

    .${PageLayout.pageClassName} [data-split-to]:not([data-footnote-call]):after,
    .${PageLayout.pageClassName} [data-split-to]:not([data-footnote-call])::after {
      content: unset;
    }

    .${PageLayout.pageClassName} [data-split-from]:not([data-footnote-call]):before,
    .${PageLayout.pageClassName} [data-split-from]:not([data-footnote-call])::before {
      content: unset;
    }

    .${PageLayout.pageClassName} li[data-split-from]:first-of-type {
      list-style: none;
    }

    .${PageLayout.pageClassName} [data-align-last-split-element='justify'] {
      text-align-last: justify;
    }
  `;
}
