import {
  type DocumentRoot,
  DEFAULT_DOCUMENT_OPTIONS,
} from 'src/entities/elements';
import {
  type Margin,
  mergeLayouts,
  LAYOUT_TYPES_MERGED,
  type LayoutTypeMerged,
} from 'src/entities/primitives';
import { flatMapNodes, type TreeRoot } from 'src/entities/tree';
import {
  Document,
  Header,
  Footer,
  TextRun,
  Paragraph,
  SectionType,
  type ISectionOptions,
  type IPageMarginAttributes,
} from 'docx';
import { merge } from 'lodash';

// TODO: Create a function that checks Paragraph, TextRun, etc. tree order.
// Put it in treeToDocumentRoot.

// TODO: Support tables.

type Content = Paragraph;

type Element = Paragraph | TextRun;

type PageType = (typeof PAGE_TYPE_BY_LAYOUT_TYPE)[LayoutTypeMerged];

const PAGE_TYPE_BY_LAYOUT_TYPE = {
  first: 'first',
  left: 'default',
  right: 'even',
} as const satisfies Record<LayoutTypeMerged, 'first' | 'default' | 'even'>;

const treeToDocx = (treeRoot: TreeRoot) => {
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
    return mapChildren(node);
  });

  return result as ReadonlyArray<Content>;
};

export const documentRootToDocx = ({
  options: documentOptions,
  stacks: stacksOption,
}: DocumentRoot<TreeRoot>) => {
  const { size: sizeOption } = merge(DEFAULT_DOCUMENT_OPTIONS, documentOptions);

  const sections = stacksOption.flatMap<ISectionOptions>(
    ({
      options: { layouts: layoutsOption, margin: marginOption } = {},
      content,
    }) => {
      const children = treeToDocx(content);
      if (!children) {
        return [];
      }

      console.log(marginOption);
      const headers: Partial<Record<PageType, Header>> = {};
      const footers: Partial<Record<PageType, Footer>> = {};

      const layoutsMerged = mergeLayouts([layoutsOption]);
      for (const layoutType of LAYOUT_TYPES_MERGED) {
        const { header, footer } = layoutsMerged[layoutType];
        if (header) {
          headers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Header({
            children: treeToDocx(header),
          });
        }
        if (footer) {
          footers[PAGE_TYPE_BY_LAYOUT_TYPE[layoutType]] = new Footer({
            children: treeToDocx(footer),
          });
        }
      }

      // console.log(headers.first?.options.children[0].root[2].root[1].root[1]);
      // console.log(headers.even?.options.children[0].root[2].root[1].root[1]);
      // console.log(headers.default?.options.children[0].root[2].root[1].root[1]);

      return {
        properties: {
          titlePage: true,
          page: {
            margin: marginOption as Record<keyof typeof marginOption, string>,
            size: sizeOption,
          },
        },
        headers,
        children,
        // footers,
      };
    },
  );

  // TODO: Size

  return new Document({ sections, evenAndOddHeaderAndFooters: true });
};
