import {
  type LayoutType,
  LAYOUT_TYPES,
  DEFAULT_DOCUMENT_OPTIONS,
  DEFAULT_STACK_OPTIONS,
  type DocumentRoot,
} from '../entities/options.js';
import { Pager } from '../utils/pager.js';
import { PageTemplate } from './pageTemplate.js';
import { merge } from 'lodash-es';
import { Root } from 'hast';
import { toDom } from 'hast-util-to-dom';

const contentTreeToDom = (
  content: Root | ReadonlyArray<Root>,
): undefined | DocumentFragment => {
  if (!content) {
    return undefined;
  }

  if (Array.isArray(content)) {
    const fragment = document.createDocumentFragment();
    fragment.append(...content.flatMap((c) => (c ? contentTreeToDom(c) : [])));
    return fragment;
  }

  return toDom(content, { fragment: true });
};

export type DocumentRootToDomOptions = {
  styleSheets?: Array<CSSStyleSheet>;
  pageClassName?: string;
};

export const treeToDom = async (
  { options: documentOptions, stacks: stacksOption }: DocumentRoot<Root>,
  {
    styleSheets: styleSheetsOption = [],
    pageClassName,
  }: DocumentRootToDomOptions = {},
): Promise<HTMLDivElement> => {
  // const perf = performance.now();

  const { size, pages } = merge(DEFAULT_DOCUMENT_OPTIONS, documentOptions);

  const pageNumberDocument = pages.enableCoverPage ? 0 : 1;

  // Create a temporary element in which to calculate / render pages.
  // Pager and PageTemplate operate in their own respective Shadow DOMs.
  const renderEl = document.createElement('div');
  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  let allTemplatesPromise: Promise<Array<PageTemplate>> = Promise.resolve([]);

  stacksOption.forEach(({ options: stackOptions = {}, children }) => {
    const content = contentTreeToDom(children);

    allTemplatesPromise = allTemplatesPromise.then(async (allTemplates) => {
      const pageNumberStack = pageNumberDocument + allTemplates.length;

      const { layouts = {}, margin } = merge(
        DEFAULT_STACK_OPTIONS,
        stackOptions,
      );

      const templates: Record<LayoutType, PageTemplate> = {
        default: new PageTemplate({
          size,
          margin,
          header: contentTreeToDom(layouts.default?.header),
          footer: contentTreeToDom(layouts.default?.footer),
          styleSheets: styleSheetsOption,
          className: pageClassName,
        }),
        first: new PageTemplate({
          size,
          margin,
          ...(layouts.first === false
            ? {}
            : {
                header: contentTreeToDom(
                  layouts.first?.header ?? layouts.default.header,
                ),
                footer: contentTreeToDom(
                  layouts.first?.footer ?? layouts.default.footer,
                ),
              }),
          styleSheets: styleSheetsOption,
          className: pageClassName,
        }),
      };

      const pager = new Pager({ styleSheets: styleSheetsOption });

      await pager.toPages({
        content,
        onContentChunked: ({ index, setPageVars }) => {
          const pageNumber = pageNumberStack + index;
          const layoutType: LayoutType = pageNumber === 0 ? 'first' : 'default';
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
          const layoutType: LayoutType = pageNumber === 0 ? 'first' : 'default';

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
      pageNumber: pageIndex + pageNumberDocument + 1,
      pageCount,
    });
    pagesEl.append(template.element);
  });

  renderEl.remove();

  return pagesEl;
};
