import { DEFAULT_PREFIX, mathUnits, selectDomElement } from '../../entities';
import type { PageSize, PageMargin, PrefixesConfig } from '../../entities';
import {
  applyDataAttributes,
  type DataAttributes,
} from '../../utils/dataAttributes';

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
  styles?: Array<HTMLStyleElement | CSSStyleSheet>;
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

const appendNodes = (parentEl: Element, el: InnerNode) => {
  if (!el) {
    return;
  }
  parentEl.append(...toNodes(el));
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

/**
 * At-rules that describe the document rather than style a subtree. `@scope`
 * may only contain style rules, so these are re-emitted next to the scoped
 * block instead of inside it, where the parser would drop them.
 */
const UNSCOPABLE_AT_RULE =
  /^@(charset|import|namespace|font-face|font-feature-values|font-palette-values|counter-style|property|page|(-\w+-)?keyframes)\b/;

const toCssText = (style: CSSStyleSheet | HTMLStyleElement): string =>
  style instanceof CSSStyleSheet
    ? Array.from(style.cssRules, (rule) => rule.cssText).join('\n')
    : // A `<style>` element only exposes `sheet` once it is in a document, so
      // its text is used directly. `disabled` is ignored on purpose: the
      // element is a carrier for CSS here, not a live stylesheet.
      (style.textContent ?? '');

/** `:host`, but not `:host-context`. */
const HOST_SELECTOR = /:host(?![\w-])(?:\(([^()]*)\))?/g;

/**
 * Rewrites `:host` to `:scope`.
 *
 * The page container used to be a shadow host, so `:host` was how a stylesheet
 * passed to the renderer reached it. It is now the `@scope` root, which is the
 * same element and the same specificity under a different name.
 */
const replaceHostSelectors = (rules: CSSRuleList): void => {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      const selectorText = rule.selectorText.replace(
        HOST_SELECTOR,
        (_match: string, argument: undefined | string) =>
          argument ? `:scope:is(${argument})` : ':scope',
      );
      if (selectorText !== rule.selectorText) {
        rule.selectorText = selectorText;
      }
    }
    // Nested style rules are grouping rules too, so this also reaches a `:host`
    // written inside `@media` or inside another rule.
    if (rule instanceof CSSGroupingRule) {
      replaceHostSelectors(rule.cssRules);
    }
  }
};

/**
 * Every scoped stylesheet already adopted by the document, keyed by the source
 * CSS it was built from. A live preview re-renders on every edit and builds a
 * fresh `CSSStyleSheet` each time, so identity is not a usable key.
 */
const adoptedScopedStyleSheets = new Map<string, CSSStyleSheet>();

/**
 * Adopts `style` on the document, limited to the subtree of `scopeSelector`.
 *
 * Page content used to live in a closed shadow root, which kept these rules out
 * of the surrounding application but also hid every anchor target from
 * `document.getElementById`. Chrome resolves `href="#id"` against the document
 * and collects link destinations by walking it, so an internal link inside a
 * shadow root produced no PDF link annotation at all. `@scope` gives the same
 * one-way containment in the light DOM: the implied `:scope ` prefix matches
 * exactly the elements the shadow root used to contain -- everything below the
 * page root, and not the page root itself -- and the prelude adds no
 * specificity, so the rules keep the order they had inside the shadow root.
 *
 * The sheets are adopted once by the document rather than embedded in each
 * page: a document is paginated into one root per page and a copy of every rule
 * in each of them would multiply style recalculation by the page count.
 */
const adoptScopedStyleSheet = (
  style: CSSStyleSheet | HTMLStyleElement,
  scopeSelector: string,
): void => {
  const cssText = toCssText(style);
  const key = `@scope (${scopeSelector}) {\n${cssText}\n}`;
  if (adoptedScopedStyleSheets.has(key)) {
    return;
  }

  // Re-parsed into a sheet of its own so that `:host` can be rewritten through
  // the CSSOM, and so that a caller's `CSSStyleSheet` is never mutated.
  const parsedStyleSheet = new CSSStyleSheet();
  parsedStyleSheet.replaceSync(cssText);
  replaceHostSelectors(parsedStyleSheet.cssRules);

  const scopable: Array<string> = [];
  const unscopable: Array<string> = [];
  for (const rule of Array.from(parsedStyleSheet.cssRules)) {
    (UNSCOPABLE_AT_RULE.test(rule.cssText) ? unscopable : scopable).push(
      rule.cssText,
    );
  }

  const scopedStyleSheet = new CSSStyleSheet();
  scopedStyleSheet.replaceSync(
    [
      ...unscopable,
      ...(scopable.length
        ? [`@scope (${scopeSelector}) {\n${scopable.join('\n')}\n}`]
        : []),
    ].join('\n'),
  );

  adoptedScopedStyleSheets.set(key, scopedStyleSheet);
  document.adoptedStyleSheets.push(scopedStyleSheet);
};

export class PageTemplate {
  private readonly options: PageTemplateOptions;

  public readonly element: Element;

  private static baseStyleSheet: undefined | CSSStyleSheet;

  private readonly pageSize: PageSize;

  /**
   * The class on {@link PageTemplate.element}. Every page stylesheet is scoped
   * to it, so it is also what a consumer's own stylesheet uses to reach a
   * rendered page. The `matti-docs` prefix is deliberate rather than derived
   * from `prefixes`: the scope selector appears in a shared, memoized
   * stylesheet, so it has to be the same for every document on the page.
   */
  public static readonly rootClassName = `${DEFAULT_PREFIX}-page-root`;

  public readonly pageEl: Element;
  public static readonly pageClassName = `${DEFAULT_PREFIX}-page`;

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
      // Shallow, so a template carries the content container but never the
      // content of the page it was cloned from.
      content: cloneNodes(options.content, false),
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

    // The base sheet is adopted first so that a document stylesheet still
    // overrides it, exactly as it did when both were adopted by the shadow
    // root in this order.
    for (const style of [
      PageTemplate.baseStyleSheet,
      ...(options.styles ?? []),
    ]) {
      adoptScopedStyleSheet(style, `.${PageTemplate.rootClassName}`);
    }

    this.pageSize = { ...options.size };

    this.pageEl = document.createElement('div');
    setClassName(
      this.pageEl,
      [options.innerClassName ?? [], PageTemplate.pageClassName].flat(),
    );
    applyDataAttributes(this.pageEl, options.innerDataAttributes);
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
      className: options.outerClassName,
      size: options.size,
      dataAttributes: options.outerDataAttributes,
    });
  }

  public extend(options: CloneOptions) {
    return new PageTemplate({
      ...PageTemplate.cloneOptions(this.options),
      ...options,
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
    [this.headerEl, this.footerEl].forEach((headerFooterEl) => {
      selectDomElement(headerFooterEl, 'pagenumber').forEach((counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageNumber}`));
      });

      selectDomElement(headerFooterEl, 'pagecount').forEach((counterEl) => {
        counterEl.appendChild(document.createTextNode(`${pageCount}`));
      });
    });
  }

  /**
   * The page container. Its content is in the light DOM: an `<a href="#id">`
   * and the `id` it points at only become a PDF link annotation when Chrome
   * can reach both of them from the document, and it never looks inside a
   * shadow root. Containment comes from `@scope` on the stylesheets instead
   * (see {@link adoptScopedStyleSheet}).
   */
  private static createRoot({
    innerEl,
    className,
    size,
    dataAttributes,
  }: {
    innerEl: Element;
    className?: string;
    size: PageSize;
    dataAttributes?: DataAttributes;
  }) {
    const rootEl = document.createElement('div');
    setClassName(rootEl, [className ?? [], PageTemplate.rootClassName].flat());
    applyDataAttributes(rootEl, dataAttributes);
    rootEl.style.setProperty('break-inside', 'avoid');
    rootEl.style.setProperty('break-after', 'page');
    rootEl.style.setProperty('width', size.width);
    rootEl.style.setProperty('height', size.height);
    rootEl.appendChild(innerEl);
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
