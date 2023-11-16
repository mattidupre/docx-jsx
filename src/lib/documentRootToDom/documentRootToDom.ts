import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
  DEFAULT_STACK_OPTIONS,
} from 'src/entities/elements';
import { Pager } from 'src/utils/pager';
import { treeToFragment, type TreeRoot } from 'src/entities/tree';
import { type LayoutTypeMerged } from 'src/entities/primitives';
import { layoutsToTemplates } from './layoutsToTemplates';
import { type PageTemplate } from './pageTemplate';
import { merge } from 'lodash';

type Options = {
  styleSheets?: Array<CSSStyleSheet>;
};

const getLayoutType = ({
  pageNumberStack,
  pageNumberPage,
}: {
  pageNumberStack: number;
  pageNumberPage: number;
}): LayoutTypeMerged => {
  if (pageNumberPage === pageNumberStack) {
    return 'first';
  }
  if (pageNumberPage % 2 === 1) {
    return 'left';
  }
  if (pageNumberPage % 2 === 0) {
    return 'right';
  }
  throw new TypeError('Invalid page numbers.');
};

export const documentRootToDom = async (
  { options: documentOptions, stacks: stacksOption }: DocumentRoot<TreeRoot>,
  { styleSheets: styleSheetsOption = [] }: Options = {},
): Promise<HTMLDivElement> => {
  const perf = performance.now();

  const { size, pages } = merge(DEFAULT_DOCUMENT_OPTIONS, documentOptions);

  console.log(pages);

  const pageNumberDocument = pages.enableCoverPage ? 0 : 1;

  // Create a temporary element in which to calculate / render pages.
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

      const { layouts, margin } = merge(DEFAULT_STACK_OPTIONS, stackOptions);

      const pageGroupEl = document.createElement('div');
      renderEl.appendChild(pageGroupEl);

      const templates = layoutsToTemplates(layouts, {
        parent: renderEl,
        size,
        margin,
        styleSheets: styleSheetsOption,
      });

      const pager = new Pager({ styleSheets: styleSheetsOption });
      await pager.toPages({
        content: treeToFragment(content),
        onContentChunked: ({ index, setPageVars }) => {
          const layoutType = getLayoutType({
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
          const layoutType = getLayoutType({
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

  console.log(Math.round(performance.now() - perf));

  return pagesEl;
};
