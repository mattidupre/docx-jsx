import { type LayoutType, LAYOUT_TYPES } from '../entities';
import { Pager } from '../utils/pager.js';
import { PageTemplate } from './pageTemplate.js';
import { mapHtmlToDocument, type HtmlNode } from './mapHtmlToDocument.js';

const objToDom = (node: HtmlNode) => {
  if (node.type === 'text') {
    return document.createTextNode(node.value);
  }

  const children = node.children as ReadonlyArray<Node>;

  if (node.type === 'element') {
    const element = document.createElement(node.tagName);
    for (const propertyName in node.properties) {
      const propertyValue = node.properties[propertyName];
      element.setAttribute(propertyName, propertyValue);
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
  styleSheets?: Array<string | CSSStyleSheet>;
  pageClassName?: string;
};

export const htmlToDom = async (
  html: string,
  {
    styleSheets: styleSheetsOption = [],
    pageClassName,
  }: DocumentRootToDomOptions = {},
): Promise<HTMLElement> => {
  const styleSheets = await Promise.all(
    styleSheetsOption.map((style) => {
      if (typeof style === 'string') {
        const styleSheet = new CSSStyleSheet();
        return styleSheet.replace(style);
      }
      return style;
    }),
  );

  const { size, stacks: stacksOption } = mapHtmlToDocument<HTMLElement>(
    html,
    objToDom,
  );

  // const perf = performance.now();

  // Create a temporary element in which to calculate / render pages.
  // Pager and PageTemplate operate in their own respective Shadow DOMs.
  const renderEl = document.createElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  let allTemplatesPromise: Promise<Array<PageTemplate>> = Promise.resolve([]);

  stacksOption.forEach(({ layouts, margin, content }) => {
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
              styleSheets,
              className: pageClassName,
            }),
          }),
        {} as Record<LayoutType, PageTemplate>,
      );

      const pager = new Pager({ styleSheets });

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
            // PagerJS doesn't like 0 margins so use 0.5in margins temporarily.
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

          // Note that contentElement is NOT cloned. It will be detached from pager.
          allTemplates.push(
            templates[layoutType].extend({
              content: contentElement,
            }),
          );
        },
      });

      return allTemplates;
    });
  });

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
