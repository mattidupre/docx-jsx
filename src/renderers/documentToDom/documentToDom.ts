import {
  type DocumentTree,
  type PageType,
  mapPageTypes,
  pageIndexToPageType,
} from 'src/entities/options';
import { treeToDom } from 'src/renderers/treeToDom';
import { Pager } from 'src/utils/pager';
import { PageLayout } from './pageLayout';

export const documentToDom = async ({
  styleSheets: styleSheetsOption = [],
  pageSize,
  pageGroups,
}: DocumentTree): Promise<HTMLDivElement> => {
  // Create a temporary element in which to calculate / render pages.
  const renderEl = document.createElement('div');

  renderEl.style.visibility = 'hidden';
  renderEl.style.position = 'absolute';
  renderEl.style.pointerEvents = 'none';
  renderEl.style.zIndex = '-9999';
  document.body.appendChild(renderEl);

  const allPageEls = await Promise.all(
    pageGroups.map(async ({ page, content }) => {
      const pageGroupEl = document.createElement('div');
      renderEl.appendChild(pageGroupEl);

      const layouts = {} as Record<PageType, PageLayout>;
      mapPageTypes((pageType) => {
        const { margins, header, footer } = page[pageType];

        const layout = new PageLayout({
          pageType,
          pageSize,
          margins,
          header: header && treeToDom(header),
          footer: footer && treeToDom(footer),
        });
        pageGroupEl.appendChild(layout.element);
        layouts[pageType] = layout;
      });

      const pageEls: Array<Element> = [];

      const pager = new Pager({ styleSheets: styleSheetsOption });
      await pager.toPages({
        content: treeToDom(content),
        onContentChunked: ({ index, setPageVars }) => {
          const layout = layouts[pageIndexToPageType(index)];
          const { width, height } = layout.getContentSize();
          setPageVars({
            // PagerJS doesn't like 0 margins so use them temporarily.
            width: `calc(${width} + 1in)`,
            height: `calc(${height} + 1in)`,
            marginTop: '0.5in',
            marginRight: '0.5in',
            marginBottom: '0.5in',
            marginLeft: '0.5in',
          });
        },
        onPageRendered: ({ contentElement, index }) => {
          const content = contentElement.cloneNode(true);
          pageEls.push(
            layouts[pageIndexToPageType(index)].toPage({
              content,
            }),
          );
        },
      });

      return pageEls;
    }),
  );

  renderEl.remove();

  const pagesEl = document.createElement('div');

  allPageEls.flat().forEach((pageEl) => {
    const newPageEl = document.createElement('div');
    const newPageShadow = newPageEl.attachShadow({ mode: 'closed' });
    newPageShadow.appendChild(pageEl);
    pagesEl.append(newPageEl);
  });

  return pagesEl;
};
