import { createPageCss, createPagesGroupCss } from './createCss';
import {
  type PageHandler,
  type Renderer,
  PREFIX,
  PAGES_GROUP_DATA_ATTRIBUTE,
  HEADER_CLASS_NAME,
  FOOTER_CLASS_NAME,
  PAGES_GROUP_CLASS_NAME,
} from './entities';
import {
  type PageType,
  parsePageTypes,
  mapPageTypes,
  type DocumentOptions,
} from 'src/entities';
import {
  mathUnits,
  createEl,
  appendCloneTo,
  getElHeight,
  createHtml,
} from 'src/utils';

export const createRenderer = ({ pagesGroups }: DocumentOptions): Renderer => {
  let documentHtml = '';
  let documentCss = '';

  const pagesGroupsData: Record<
    string,
    Record<PageType, Record<'headerEl' | 'footerEl', null | HTMLElement>>
  > = {};

  pagesGroups.forEach(({ contentHtml, id, pageTypes = {} }) => {
    if (!contentHtml) {
      return;
    }

    const pagesGroupId = `${PREFIX}_${id}`;

    documentCss += createPagesGroupCss(pagesGroupId);

    pagesGroupsData[pagesGroupId] = mapPageTypes(
      parsePageTypes(pageTypes),
      (
        pageType,
        {
          headerHtml,
          footerHtml,
          width,
          height,
          marginTop,
          marginRight,
          marginBottom,
          marginLeft,
        },
      ) => {
        const headerEl = createEl(headerHtml, {
          class: HEADER_CLASS_NAME,
        });

        const footerEl = createEl(footerHtml, {
          class: FOOTER_CLASS_NAME,
        });

        documentCss += createPageCss(pagesGroupId, pageType, {
          width,
          height,
          marginTop: mathUnits('add', marginTop, getElHeight(headerEl, width)),
          marginRight,
          marginBottom: mathUnits(
            'add',
            marginBottom,
            getElHeight(footerEl, width),
          ),
          marginLeft,
        });

        return {
          headerEl,
          footerEl,
        };
      },
    );

    documentHtml += createHtml(contentHtml, {
      [PAGES_GROUP_DATA_ATTRIBUTE]: pagesGroupId,
      class: PAGES_GROUP_CLASS_NAME,
    });
  });

  const pageHandler: PageHandler = (pageEl, pagesGroupId, pageType) => {
    const data = pagesGroupsData[pagesGroupId];
    const { headerEl, footerEl } = data[pageType];
    appendCloneTo(pageEl, headerEl);
    appendCloneTo(pageEl, footerEl);
  };

  return { documentHtml, documentCss, pageHandler };
};
