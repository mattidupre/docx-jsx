import { type LayoutType, LAYOUT_TYPES } from '../entities';
import { Pager } from '../utils/pager.js';
import { PageTemplate } from './pageTemplate.js';
import { mapHtmlToDocument } from './mapHtmlToDocument.js';
import { toDom } from 'hast-util-to-dom';
import * as Hast from 'hast';

const contentTreeToDom = (content: Hast.Root | ReadonlyArray<Hast.Root>) => {
  if (Array.isArray(content)) {
    const fragment = document.createDocumentFragment();
    fragment.append(...content.flatMap((c) => contentTreeToDom(c) ?? []));
    return fragment;
  }

  return toDom(content as Hast.Root, { fragment: true }) as DocumentFragment;
};

export type DocumentRootToDomOptions = {
  styleSheets?: Array<CSSStyleSheet>;
  pageClassName?: string;
};

export const htmlToDom = async (
  html: string,
  {
    styleSheets: styleSheetsOption = [],
    pageClassName,
  }: DocumentRootToDomOptions = {},
): Promise<HTMLElement> => {
  const { size, stacks: stacksOption } = mapHtmlToDocument(
    html,
    (node) => node,
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

  // TODO: use Promise.all again.
  stacksOption.forEach(({ layouts, margin, children: stackChildren }) => {
    const content = contentTreeToDom(stackChildren as ReadonlyArray<Hast.Root>);

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
              header: contentTreeToDom(
                layouts[layoutType]?.header as Hast.Root,
              ),
              footer: contentTreeToDom(
                layouts[layoutType]?.footer as Hast.Root,
              ),
              styleSheets: styleSheetsOption,
              className: pageClassName,
            }),
          }),
        {} as Record<LayoutType, PageTemplate>,
      );

      const pager = new Pager({ styleSheets: styleSheetsOption });

      await pager.toPages({
        content,
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
