import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
} from '../../entities/elements.js';
import {
  checkLayouts,
  LAYOUT_TYPES,
  type LayoutType,
} from '../../entities/primitives.js';
import { type TreeRoot } from '../../entities/tree.js';
import {
  Document,
  Header,
  Footer,
  SectionType,
  type ISectionOptions,
} from 'docx';
import { treeContentToDocx } from './treeContentToDocx.js';
import { merge } from 'lodash-es';

type PageType = (typeof PAGE_TYPE_BY_LAYOUT_TYPE)[LayoutType];

const PAGE_TYPE_BY_LAYOUT_TYPE = {
  first: 'first',
  left: 'default',
  right: 'even',
} as const satisfies Record<LayoutType, 'first' | 'default' | 'even'>;

export const documentRootToDocx = ({
  options: documentOptions,
  stacks: stacksOption,
}: DocumentRoot<TreeRoot>) => {
  const {
    size: sizeOption,
    pages: { enableCoverPage },
  } = merge(DEFAULT_DOCUMENT_OPTIONS, documentOptions);

  const documentStartPageNumber = enableCoverPage ? 0 : 1;

  const sections = stacksOption.flatMap<ISectionOptions>(
    (
      {
        options: { layouts: layoutsOption, margin: marginOption } = {},
        content,
      },
      stackIndex,
    ) => {
      checkLayouts(layoutsOption);

      const sectionType =
        stackIndex === 0
          ? enableCoverPage
            ? SectionType.EVEN_PAGE
            : SectionType.ODD_PAGE
          : SectionType.CONTINUOUS;

      const stackStartPageNumber =
        stackIndex === 0 ? documentStartPageNumber : undefined;

      const children = treeContentToDocx(content, { isContent: true });
      if (!children) {
        return [];
      }

      const headers: Partial<Record<PageType, Header>> = {};
      const footers: Partial<Record<PageType, Footer>> = {};

      for (const layoutType of LAYOUT_TYPES) {
        const { header, footer } = layoutsOption?.[layoutType] || {};
        if (header) {
          headers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Header({
            children: treeContentToDocx(header, { isContent: false }),
          });
        }
        if (footer) {
          footers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Footer({
            children: treeContentToDocx(footer, { isContent: false }),
          });
        }
      }

      return {
        properties: {
          // Undefined first layout defaults to left / right.
          // False first layout renders with no header or footer.
          titlePage: layoutsOption?.first !== undefined,
          type: sectionType,
          page: {
            pageNumbers: {
              start: stackStartPageNumber,
            },
            margin: marginOption as Record<keyof typeof marginOption, string>,
            size: sizeOption,
          },
        },
        headers,
        children,
        footers,
      };
    },
  );

  return new Document({ sections, evenAndOddHeaderAndFooters: true });
};
