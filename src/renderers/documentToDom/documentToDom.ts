import {
  type DocumentTree,
  type PageType,
  mapPageTypes,
} from 'src/entities/options';
import { treeToDom } from 'src/renderers/treeToDom';
import { CHUNKER_STYLE, createPagedjsLayoutRule, chunkPages } from './chunker';
import { PageLayout, PAGE_STYLE_BASE, PAGE_STYLE_PRINT } from './pageLayout';
import { buildPageGroupId, buildPageGroupClassName } from './entities';

// TODO: Figure out how odd / even and left / right pages compare between docx and pagedjs.
// TODO: Rename pageGroup.page to layouts, document.pageWidth to document.layout[no S].pageWidth
// TODO: HERE: Rename PageGroups to Stacks.
// Add Stack.layouts / Stack.layout / Document.layouts / Document.layout
export const documentToDom = async ({
  pageSize,
  pageGroups,
}: DocumentTree): Promise<HTMLDivElement> => {
  // Create a shadow element in which to render temporary pages.
  const hostEl = document.createElement('div');
  hostEl.style.visibility = 'hidden';
  hostEl.style.position = 'absolute';
  hostEl.style.pointerEvents = 'none';
  hostEl.style.zIndex = '-9999';
  document.body.appendChild(hostEl);
  const renderEl = hostEl.attachShadow({ mode: 'open' });

  const pagesStyleSheet = new CSSStyleSheet();
  pagesStyleSheet.replaceSync(PAGE_STYLE_BASE);
  renderEl.adoptedStyleSheets.push(pagesStyleSheet);

  const chunkerStyleSheet = new CSSStyleSheet();
  chunkerStyleSheet.replaceSync(CHUNKER_STYLE);
  renderEl.adoptedStyleSheets.push(chunkerStyleSheet);

  const allPageEls = await Promise.all(
    pageGroups.map(async ({ page, content }, pageGroupIndex) => {
      const pageGroupId = buildPageGroupId(pageGroupIndex);

      const pageGroupEl = document.createElement('div');
      pageGroupEl.classList.add(buildPageGroupClassName(pageGroupId));
      renderEl.appendChild(pageGroupEl);

      const layouts = {} as Record<PageType, PageLayout>;
      mapPageTypes((pageType) => {
        const { margins, header, footer } = page[pageType];

        const layout = new PageLayout({
          pageGroupId,
          pageType,
          pageSize,
          margins,
          header: header && treeToDom(header),
          footer: footer && treeToDom(footer),
        });
        pageGroupEl.appendChild(layout.pageEl);
        layouts[pageType] = layout;

        // TODO: If performance is an issue, refactor this to run in a separate loop so it batches.
        chunkerStyleSheet.insertRule(
          createPagedjsLayoutRule({
            pageGroupId,
            pageType,
            contentSize: layout.getContentSize(),
          }),
        );
      });

      const chunkedPages = await chunkPages(treeToDom(content), pageGroupEl);

      const pageEls = chunkedPages.map(({ pageType, contentEl }) =>
        layouts[pageType].cloneEl({ content: contentEl }),
      );

      pageGroupEl.remove();

      return pageEls;
    }),
  );

  hostEl.remove();

  const pagesEl = document.createElement('div');

  // TODO: Confirm print styles work in shadow DOM.
  const printStyleSheet = new CSSStyleSheet();
  printStyleSheet.replaceSync(PAGE_STYLE_PRINT);

  allPageEls.flat().forEach((pageEl) => {
    const newPageEl = document.createElement('div');
    const newPageShadow = newPageEl.attachShadow({ mode: 'closed' });
    newPageShadow.appendChild(pageEl);
    newPageShadow.adoptedStyleSheets.push(pagesStyleSheet, printStyleSheet);
    pagesEl.append(newPageEl);
  });

  return pagesEl;
};
