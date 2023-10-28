import { type PageType } from 'src/entities';
import { ID_PREFIX } from 'src/entities';

export const PAGES_GROUP_DATA_ATTRIBUTE = `data-${ID_PREFIX}-group-id`;
export const PAGES_GROUP_CLASS_NAME = `${ID_PREFIX}_pagesgroup`;
export const HEADER_CLASS_NAME = `${ID_PREFIX}_header`;
export const FOOTER_CLASS_NAME = `${ID_PREFIX}_footer`;

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
