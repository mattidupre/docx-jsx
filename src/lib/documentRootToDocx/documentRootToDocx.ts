import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
} from 'src/entities/elements';
import {
  checkLayouts,
  LAYOUT_TYPES,
  LayoutsPartial,
  type LayoutType,
} from 'src/entities/primitives';
import { flatMapNodes, type TreeRoot } from 'src/entities/tree';
import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  PageNumber,
  SectionType,
  type ISectionOptions,
} from 'docx';
import { merge } from 'lodash';

// TODO: Create a function that checks Paragraph, TextRun, etc. order by tree appearance.
// Put it in treeToDocumentRoot.

type Content = Paragraph;

type Element = Paragraph | TextRun;

type PageType = (typeof PAGE_TYPE_BY_LAYOUT_TYPE)[LayoutType];

const PAGE_TYPE_BY_LAYOUT_TYPE = {
  first: 'first',
  left: 'default',
  right: 'even',
} as const satisfies Record<LayoutType, 'first' | 'default' | 'even'>;

const treeToDocx = (
  treeRoot: TreeRoot,
  { isContent }: { isContent: boolean },
) => {
  const result = flatMapNodes<Element>(treeRoot, (node, mapChildren) => {
    if (node.type === 'root') {
      return mapChildren(node);
    }
    if (node.type === 'text') {
      return new TextRun({ text: node.value });
    }
    if (node.data.elementType === 'textrun') {
      return new TextRun({ children: mapChildren(node) });
    }
    if (node.data.elementType === 'paragraph') {
      return new Paragraph({ children: mapChildren(node) });
    }
    if (node.data.elementType === 'counter') {
      if (isContent) {
        throw new Error('Counters cannot appear in page content.');
      }
      const { counterType } = node.data.options;
      if (counterType === 'page-number') {
        return new TextRun({ children: [PageNumber.CURRENT] });
      }
      if (counterType === 'page-count') {
        return new TextRun({ children: [PageNumber.TOTAL_PAGES] });
      }
      throw new TypeError('Invalid counterType.');
    }
    return mapChildren(node);
  });

  return result as ReadonlyArray<Content>;
};

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

      const children = treeToDocx(content, { isContent: true });
      if (!children) {
        return [];
      }

      const headers: Partial<Record<PageType, Header>> = {};
      const footers: Partial<Record<PageType, Footer>> = {};

      for (const layoutType of LAYOUT_TYPES) {
        const { header, footer } = layoutsOption?.[layoutType] || {};
        if (header) {
          headers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Header({
            children: treeToDocx(header, { isContent: false }),
          });
        }
        if (footer) {
          footers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Footer({
            children: treeToDocx(footer, { isContent: false }),
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
