import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
  DEFAULT_STACK_OPTIONS,
} from '../../entities/elements.js';
import { Pager } from '../../utils/pager.js';
import { type TreeRoot } from '../../entities/tree.js';
import { treeContentToDom } from './treeContentToDom.js';
import { checkLayouts } from '../../entities/primitives.js';
import { PageTemplate } from './pageTemplate.js';
import { merge } from 'lodash-es';

export type DocumentRootToDomOptions = {
  styleSheets?: Array<CSSStyleSheet>;
  pageClassName?: string;
};

const TEMPLATE_TYPES = [
  'first-left',
  'first-right',
  'default-left',
  'default-right',
] as const;

type TemplateType = (typeof TEMPLATE_TYPES)[number];

const getTemplateType = ({
  pageNumberStack,
  pageNumberPage,
}: {
  pageNumberStack: number;
  pageNumberPage: number;
}): TemplateType => {
  const prefix = pageNumberPage === pageNumberStack ? 'first' : 'default';
  if (pageNumberPage % 2 === 1) {
    return `${prefix}-left`;
  }
  if (pageNumberPage % 2 === 0) {
    return `${prefix}-right`;
  }
  throw new TypeError('Invalid page numbers.');
};

export const documentRootToDom = async (
  { options: documentOptions, stacks: stacksOption }: DocumentRoot<TreeRoot>,
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

  stacksOption.forEach(({ options: stackOptions = {}, content }) => {
    allTemplatesPromise = allTemplatesPromise.then(async (allTemplates) => {
      const pageNumberStack = pageNumberDocument + allTemplates.length;

      const { layouts = {}, margin } = merge(
        DEFAULT_STACK_OPTIONS,
        stackOptions,
      );

      checkLayouts(layouts);

      const templates = {} as Record<TemplateType, PageTemplate>;
      for (const layoutType of ['left', 'right'] as const) {
        const defaultTemplate = new PageTemplate({
          size,
          margin,
          header: treeContentToDom(layouts[layoutType]?.header),
          footer: treeContentToDom(layouts[layoutType]?.footer),
          styleSheets: styleSheetsOption,
          className: pageClassName,
        });
        renderEl.appendChild(defaultTemplate.element);
        // Undefined first layout defaults to left / right.
        // False first layout renders with no header or footer.
        const firstTemplate =
          layouts.first === undefined
            ? defaultTemplate
            : new PageTemplate({
                size,
                margin,
                header: treeContentToDom(
                  layouts.first ? layouts.first.header : undefined,
                ),
                footer: treeContentToDom(
                  layouts.first ? layouts.first.header : undefined,
                ),
                styleSheets: styleSheetsOption,
                className: pageClassName,
              });
        renderEl.appendChild(firstTemplate.element);
        templates[`default-${layoutType}`] = defaultTemplate;
        templates[`first-${layoutType}`] = firstTemplate;
      }

      const pager = new Pager({ styleSheets: styleSheetsOption });
      await pager.toPages({
        content: treeContentToDom(content),
        onContentChunked: ({ index, setPageVars }) => {
          const layoutType = getTemplateType({
            pageNumberStack,
            pageNumberPage: pageNumberStack + index,
          });
          const { width, height } = templates[layoutType].contentSize;

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
          const layoutType = getTemplateType({
            pageNumberStack,
            pageNumberPage: pageNumberStack + index,
          });

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
      pageNumber: pageIndex + pageNumberDocument,
      pageCount,
    });
    pagesEl.append(template.element);
  });

  renderEl.remove();

  return pagesEl;
};
