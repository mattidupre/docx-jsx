import { selectDomElement } from '../../entities';
import type { PageSize, PageMargin, PrefixesConfig } from '../../entities';
import { mathUnits } from '../../utils/units';

type InnerNode = undefined | Node | NodeList;

export type PageTemplateOptions = {
  prefixes: PrefixesConfig;
  size: PageSize;
  margin: PageMargin;
  header?: InnerNode;
  content?: InnerNode;
  footer?: InnerNode;
  pageClassName?: string;
};

export type CloneOptions = {
  content?: InnerNode;
};

export type ReplaceCountersOptions = {
  pageNumber: number;
  pageCount: number;
};

const elementsToArray = (el: undefined | InnerNode): Array<Node> => {
  if (el === undefined) {
    return [];
  }
  if (el instanceof Node) {
    return [el];
  }
  if (typeof el[Symbol.iterator] === 'function') {
    return Array.prototype.map.call(el, (e) => {
      if (!(e instanceof Element)) {
        throw new TypeError('All nodes must be elements');
      }
      return e;
    }) as Array<Element>;
  }
  throw new TypeError('Invalid element.');
};

const setClassName = (
  innerNode: undefined | InnerNode,
  className?: string | Array<undefined | string>,
) => {
  if (!className) {
    return;
  }

  const classNames = (
    Array.isArray(className) ? className : [className]
  ).flatMap((cn) => (cn ? cn.split(/\s+/) : []));

  elementsToArray(innerNode).forEach((node) => {
    for (const className of classNames) {
      if ('classList' in node && className) {
        (node as Element).classList.add(className);
      }
    }
  });
};

const createSlotElement = ({
  rootElement,
  parentElement,
  className,
  children,
}: {
  rootElement: Element;
  parentElement: Element;
  className?: string;
  children?: InnerNode;
}) => {
  const element = document.createElement('div');
  parentElement.append(element);

  // const slot = document.createElement('slot');
  // element.append(slot);

  // const lightElement = document.createElement('div');
  // rootElement.append(lightElement);
  // slot.assign(lightElement);
  element.append(...elementsToArray(children)); // lightElement.append(...elementsToArray(children));

  if (className) {
    element.classList.add(className);
  }

  return element;
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

export class PageTemplate {
  private readonly options: PageTemplateOptions;

  public readonly element: HTMLElement;

  private readonly pageSize: PageSize;

  public readonly pageEl: Element;
  public static readonly pageClassName = 'page';
  public static readonly outerPageClassName = 'TEMP_page';

  public readonly headerEl: Element;
  public static readonly headerClassName = `${PageTemplate.pageClassName}__header`;

  public readonly contentEl: Element;
  public static readonly contentClassName = `${PageTemplate.pageClassName}__content`;

  public readonly footerEl: Element;
  public static readonly footerClassName = `${PageTemplate.pageClassName}__footer`;

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
      // Don't preserve content.
      content: cloneNodes(options.header, false),
      footer: cloneNodes(options.footer, true),
    };
  }

  constructor({ content, ...options }: PageTemplateOptions) {
    this.options = PageTemplate.cloneOptions(options);
    this.pageSize = { ...options.size };

    this.element = document.createElement('div');
    setClassName(this.element, [
      PageTemplate.outerPageClassName,
      options.pageClassName,
    ]);

    this.element.style.setProperty('break-inside', 'avoid');
    this.element.style.setProperty('break-after', 'page');
    this.element.style.setProperty('width', options.size.width);
    this.element.style.setProperty('height', options.size.height);

    // const shadowElement = this.element.attachShadow({
    //   mode: 'closed',
    //   slotAssignment: 'manual',
    // });
    // shadowElement.adoptedStyleSheets.push(PageTemplate.getBaseStyleSheet());

    this.pageEl = document.createElement('div');
    setClassName(this.pageEl, PageTemplate.pageClassName);
    this.pageEl.setAttribute('style', PageTemplate.createCssVars(options));
    this.element.appendChild(this.pageEl); // shadowElement.appendChild(this.pageEl);

    this.headerEl = createSlotElement({
      rootElement: this.element,
      parentElement: this.pageEl,
      className: PageTemplate.headerClassName,
      children: options.header,
    });

    this.contentEl = createSlotElement({
      rootElement: this.element,
      parentElement: this.pageEl,
      className: PageTemplate.contentClassName,
      children: content,
    });

    this.footerEl = createSlotElement({
      rootElement: this.element,
      parentElement: this.pageEl,
      className: PageTemplate.footerClassName,
      children: options.footer,
    });
  }

  public extend({ content }: CloneOptions) {
    return new PageTemplate({
      ...PageTemplate.cloneOptions(this.options),
      content,
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
    selectDomElement(this.options.prefixes, this.element, 'pagenumber').forEach(
      (counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageNumber}`));
      },
    );

    selectDomElement(this.options.prefixes, this.element, 'pagecount').forEach(
      (counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageCount}`));
      },
    );
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

  private static baseStyleSheet: undefined | CSSStyleSheet;
  private static getBaseStyleSheet() {
    if (!PageTemplate.baseStyleSheet) {
      PageTemplate.baseStyleSheet = new CSSStyleSheet();
      PageTemplate.baseStyleSheet.replaceSync(PageTemplate.innerStyle);
    }
    return PageTemplate.baseStyleSheet;
  }

  public static innerStyle = `
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
      width: calc(100% - var(--page-margin-left) - var(--page-margin-right));
      position: absolute;
      top: var(--page-margin-header);
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
      width: calc(100% - var(--page-margin-left) - var(--page-margin-right));
      position: absolute;
      bottom: var(--page-margin-footer);
    }
  `;

  public static outerStyle = `
    /* From PagedJS */

    .${PageTemplate.outerPageClassName} {
      border: 10px solid magenta !important;
    }

    .${PageTemplate.outerPageClassName} [data-split-from] {
      counter-increment: unset;
      counter-reset: unset;
    }

    .${PageTemplate.outerPageClassName} [data-split-to] {
      margin-bottom: unset;
      padding-bottom: unset;
    }

    .${PageTemplate.outerPageClassName} [data-split-from] {
      text-indent: unset;
      margin-top: unset;
      padding-top: unset;
      initial-letter: unset;
    }

    .${PageTemplate.outerPageClassName} [data-split-from] > *::first-letter,
    .${PageTemplate.outerPageClassName} [data-split-from]::first-letter {
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

    .${PageTemplate.outerPageClassName} [data-split-to]:not([data-footnote-call]):after,
    .${PageTemplate.outerPageClassName} [data-split-to]:not([data-footnote-call])::after {
      content: unset;
    }

    .${PageTemplate.outerPageClassName} [data-split-from]:not([data-footnote-call]):before,
    .${PageTemplate.outerPageClassName} [data-split-from]:not([data-footnote-call])::before {
      content: unset;
    }

    .${PageTemplate.outerPageClassName} li[data-split-from]:first-of-type {
      list-style: none;
    }

    .${PageTemplate.outerPageClassName} [data-align-last-split-element='justify'] {
      text-align-last: justify;
    }
   `;
}
