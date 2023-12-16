import {
  type LayoutType,
  LAYOUT_TYPES,
  type DocumentElement,
  assignHtmlAttributes,
  assignElementsContext,
  textOptionsToCssVars,
  paragraphOptionsToCssVars,
} from '../entities';
import { Pager } from '../utils/pager.js';
import { documentStyleCss } from '../style.js';
import { cssVarsToString } from '../utils/cssVars';
import { PageTemplate } from './pageTemplate.js';
import { mapHtmlToDocument, type HtmlNode } from './mapHtmlToDocument.js';

export type DocumentDom = DocumentElement<HTMLElement>;

const objToDom = (node: HtmlNode) => {
  if (node.type === 'text') {
    return document.createTextNode(node.value);
  }

  const children = node.children as ReadonlyArray<Node>;

  if (node.type === 'element') {
    const {
      properties,
      tagName,
      data: {
        element: { elementOptions },
      },
    } = node;

    const elementContext = assignElementsContext({}, elementOptions);

    const attributes = assignHtmlAttributes({}, properties, {
      style: cssVarsToString({
        ...textOptionsToCssVars(elementContext.text),
        ...paragraphOptionsToCssVars(elementContext.paragraph),
      }),
    });

    const element = document.createElement(tagName);
    for (const attributeName in attributes) {
      if (attributes[attributeName]) {
        element.setAttribute(attributeName, attributes[attributeName]);
      }
    }
    element.append(...children);

    return element;
  }

  if (node.type === 'root') {
    const element = document.createDocumentFragment();
    element.append(...children);
    return element;
  }

  throw new TypeError('Invalid node type.');
};

export type DocumentRootToDomOptions = {
  styleSheets?: ReadonlyArray<string | CSSStyleSheet | HTMLStyleElement>;
  onDocument?: (document: DocumentDom) => void;
};

let styleSheetPromise: Promise<CSSStyleSheet>;

export const htmlToDom = async (
  html: string,
  {
    styleSheets: styleSheetsOption = [],
    onDocument,
  }: DocumentRootToDomOptions = {},
): Promise<HTMLElement> => {
  if (!styleSheetPromise) {
    const styleSheet = new CSSStyleSheet();
    styleSheetPromise = styleSheet.replace(documentStyleCss);
  }

  const styleSheets = await Promise.all([
    styleSheetPromise,
    ...styleSheetsOption.map((style) => {
      if (typeof style === 'string') {
        const styleSheet = new CSSStyleSheet();
        return styleSheet.replace(style);
      }
      if (style instanceof HTMLStyleElement) {
        const styleElement = style.cloneNode() as HTMLStyleElement;
        styleElement.removeAttribute('disabled');
        return styleElement;
      }
      return style;
    }),
  ]);

  const documentObj = mapHtmlToDocument<HTMLElement>(
    html,
    objToDom,
  ) satisfies DocumentDom;

  onDocument?.(documentObj);

  const { size, stacks: stacksOption } = documentObj;

  // const perf = performance.now();

  // Create a temporary element in which to calculate / render pages. Pager and
  // PageTemplate operate in their own respective Shadow DOMs.
  const renderEl = document.createElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  let allTemplatesPromise: Promise<Array<PageTemplate>> = Promise.resolve([]);

  stacksOption.forEach(
    ({ layouts, margin, content, innerPageClassName, outerPageClassName }) => {
      if (!content) {
        return;
      }

      allTemplatesPromise = allTemplatesPromise.then(async (allTemplates) => {
        const pageNumberStack = allTemplates.length;

        const templates = LAYOUT_TYPES.reduce(
          (target, layoutType) =>
            Object.assign(target, {
              [layoutType]: new PageTemplate({
                size,
                margin,
                header: layouts[layoutType]?.header,
                footer: layouts[layoutType]?.footer,
                styles: styleSheets,
                outerClassName: outerPageClassName,
                innerClassName: innerPageClassName,
              }),
            }),
          {} as Record<LayoutType, PageTemplate>,
        );

        const pager = new Pager({ styles: styleSheets });

        await pager.toPages({
          content: content,
          onContentChunked: ({ index, setPageVars }) => {
            const pageNumber = pageNumberStack + index;
            const layoutType: LayoutType =
              pageNumber === 0 ? 'first' : 'subsequent';
            const template = templates[layoutType];
            renderEl.appendChild(template.element);
            const { width, height } = template.contentSize;

            setPageVars({
              // PagerJS doesn't like 0 margins so use 0.5in margins
              // temporarily.
              width: `calc(${width} + 1in)`,
              height: `calc(${height} + 1in)`,
              marginTop: '0.5in',
              marginRight: '0.5in',
              marginBottom: '0.5in',
              marginLeft: '0.5in',
            });
          },
          onPageRendered: ({ index, contentElement }) => {
            const pageNumber = pageNumberStack + index;
            const layoutType: LayoutType =
              pageNumber === 0 ? 'first' : 'subsequent';

            // Note that contentElement is NOT cloned. It will be detached from
            // pager.
            allTemplates.push(
              templates[layoutType].extend({
                content: contentElement.firstChild!.childNodes,
              }),
            );
          },
        });

        return allTemplates;
      });
    },
  );

  const pagesEl = document.createElement('div');

  const allTemplates = await allTemplatesPromise;

  const pageCount = allTemplates.length;
  allTemplates.forEach((template, pageIndex) => {
    template.replaceCounters({
      pageNumber: pageIndex + 1,
      pageCount,
    });
    pagesEl.append(template.element);
  });

  renderEl.remove();

  return pagesEl;
};
