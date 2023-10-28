import { type PagesGroupOptions, type PageType } from 'src/entities';

export const PREFIX = 'pagedjs_custom';

export const PAGES_GROUP_DATA_ATTRIBUTE = `data-${PREFIX}-group-id`;
export const PAGES_GROUP_CLASS_NAME = `${PREFIX}_pagesgroup`;
export const HEADER_CLASS_NAME = `${PREFIX}_header`;
export const FOOTER_CLASS_NAME = `${PREFIX}_footer`;

export type PageHandler = (
  pageEl: HTMLElement,
  pageGroupId: string,
  pageType: PageType,
) => void;

export type Renderer = {
  documentHtml: string;
  documentCss: string;
  pageHandler: PageHandler;
};
