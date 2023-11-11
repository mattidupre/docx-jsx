import { ID_PREFIX } from 'src/entities/config';
import {
  type PageSize,
  type PageMargins,
  type PageType,
} from 'src/entities/options';
import { mathUnits } from 'src/utils';

type InsideEl = undefined | Node | NodeList;
const appendInsideEl = (parentEl: Element, el: undefined | InsideEl) => {
  if (!el) {
    return;
  }
  return parentEl.append(...('length' in el ? [...el] : [el]));
};

type PageOptions = {
  pageGroupId: string;
  pageType: PageType;
  pageSize: PageSize;
  margins: PageMargins;
  header?: InsideEl;
  content?: InsideEl;
  footer?: InsideEl;
};

// @media print {
// 	html {
// 		width: 100%;
// 		height: 100%;
// 		-webkit-print-color-adjust: exact;
// 		print-color-adjust: exact;
// 	}
// 	body {
// 		margin: 0;
// 		padding: 0;
// 		width: 100% !important;
// 		height: 100% !important;
// 		min-width: 100%;
// 		max-width: 100%;
// 		min-height: 100%;
// 		max-height: 100%;
// 	}
// 	.pagedjs_pages {
// 		width: auto;
// 		display: block !important;
// 		transform: none !important;
// 		height: 100% !important;
// 		min-height: 100%;
// 		max-height: 100%;
// 		overflow: visible;
// 	}
// 	.pagedjs_page {
// 		margin: 0;
// 		padding: 0;
// 		max-height: 100%;
// 		min-height: 100%;
// 		height: 100% !important;
// 		page-break-after: always;
// 		break-after: page;
// 	}
// 	.pagedjs_sheet {
// 		margin: 0;
// 		padding: 0;
// 		max-height: 100%;
// 		min-height: 100%;
// 		height: 100% !important;
// 	}
// }

export class PageLayout {
  readonly size: PageSize;
  readonly margins: PageMargins;

  readonly pageEl: HTMLDivElement;
  readonly instancePageSelector: string;
  static pageClassName = `${ID_PREFIX}-page`;

  readonly headerEl: HTMLDivElement;
  static headerClassName = `${PageLayout.pageClassName}__header`;

  readonly contentEl: HTMLDivElement;
  static contentClassName = `${PageLayout.pageClassName}__content`;

  readonly footerEl: HTMLDivElement;
  static footerClassName = `${PageLayout.pageClassName}__footer`;

  constructor(options: PageOptions) {
    this.size = { ...options.pageSize };
    this.margins = { ...options.margins };

    const pageClassNames = [
      `${PageLayout.pageClassName}`,
      `${PageLayout.pageClassName}--${options.pageGroupId}`,
      `${PageLayout.pageClassName}--${options.pageType}`,
    ];

    this.pageEl = document.createElement('div');
    this.instancePageSelector = pageClassNames.map((c) => `.${c}`).join('');
    this.pageEl.classList.add(...pageClassNames);
    this.pageEl.setAttribute('style', PageLayout.createCssVars(options));

    this.headerEl = document.createElement('div');
    this.headerEl.classList.add(PageLayout.headerClassName);
    appendInsideEl(this.headerEl, options.header);
    this.pageEl.appendChild(this.headerEl);

    this.contentEl = document.createElement('div');
    this.contentEl.classList.add(PageLayout.contentClassName);
    appendInsideEl(this.contentEl, options.content);
    this.pageEl.appendChild(this.contentEl);

    this.footerEl = document.createElement('div');
    this.footerEl.classList.add(PageLayout.footerClassName);
    appendInsideEl(this.footerEl, options.footer);
    this.pageEl.appendChild(this.footerEl);
  }

  static createCssVars({
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

  getContentSize(): PageSize {
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
    // console.log(
    //   `content height: ${mathUnits(
    //     'multiply',
    //     this.size.height,
    //     contentHeight / pageHeight,
    //   )}`,
    //   `header height: ${mathUnits(
    //     'multiply',
    //     this.size.height,
    //     this.headerEl.getBoundingClientRect().height / pageHeight,
    //   )}`,
    //   `footer height: ${mathUnits(
    //     'multiply',
    //     this.size.height,
    //     this.footerEl.getBoundingClientRect().height / pageHeight,
    //   )}`,
    //   `page height: ${this.size.height}`,
    // );

    return {
      width: mathUnits('multiply', this.size.width, contentWidth / pageWidth),
      height: mathUnits(
        'multiply',
        this.size.height,
        contentHeight / pageHeight,
      ),
    };
  }

  cloneEl({ content }: Pick<PageOptions, 'content'>) {
    const clonedEl = this.pageEl.cloneNode(true) as Element;
    appendInsideEl(
      clonedEl.querySelector(`.${PageLayout.contentClassName}`)!,
      content,
    );
    return clonedEl;
  }
}

export const PAGE_STYLE_BASE = `
  .${PageLayout.pageClassName} {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    width: var(--page-width);
    height: var(--page-height);

    padding-top: var(--page-margin-top);
    padding-right: var(--page-margin-right);
    padding-bottom: var(--page-margin-bottom);
    padding-left: var(--page-margin-left);

    /* TEMP */
    background-color: grey;
    margin-bottom: 0.25in;
  }

  .${PageLayout.headerClassName} {
    flex-shrink: 0;

    background-color: red;
  }

  .${PageLayout.contentClassName} {
    display: block;
    position: relative;
    width: 100%;
    min-height: 0;
    flex-grow: 1;
    columns: auto;

    background-color: green;
  }

  .${PageLayout.footerClassName} {
    flex-shrink: 0;

    background-color: blue;
  }

  /* Imported from PagedJS */

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

export const PAGE_STYLE_PRINT = `
  .${PageLayout.pageClassName} {
    margin: 0;
    padding: 0;
    max-height: 100%;
    min-height: 100%;
    height: 100% !important;
    page-break-after: always;
    break-after: page;
  }
`;
