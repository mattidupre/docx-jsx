import { type RequiredDeep } from 'type-fest';
import {
  type PageType,
  type PageMargins,
  type PageSize,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_MARGINS,
  mapPageTypes,
  extendValuesByPageType,
} from 'src/entities/options';
import {
  getElementData,
  getElementType,
  isElementOfType,
  type Element,
  type ElementData,
} from 'src/entities/elements';
import {
  type TreeRoot,
  type TreeChild,
  type TreeNode,
  findTreeNodes,
  type TreeElement,
} from 'src/utils/tree';

type Content = TreeRoot;

export type Document = {
  pageSize: PageSize;
  pageGroups: Array<{
    page: Record<
      PageType,
      {
        margins: PageMargins;
        header: undefined | Content;
        footer: undefined | Content;
      }
    >;
    content: Content;
  }>;
};

const createContent = (
  {
    data = {},
    children = [],
  }: {
    data?: ElementData;
    children?: Array<TreeChild>;
  } = { data: {}, children: [] },
): Content => ({
  type: 'root',
  data,
  children,
});

export const treeToDocument = (rootNode: TreeNode): Document => {
  const documentNodes = findTreeNodes<Element<'document'>>(
    rootNode,
    (thisNode) => {
      return isElementOfType(thisNode, 'document');
    },
  );

  if (documentNodes.length !== 1) {
    throw new TypeError('Expected exactly one document element.');
  }
  const documentNode = documentNodes[0];
  const pageGroupNodes = findTreeNodes<Element<'pagegroup'>>(
    documentNode,
    (thisNode) => isElementOfType(thisNode, 'pagegroup'),
  );
  if (pageGroupNodes.length === 0) {
    throw new TypeError('Expected at least one page group element.');
  }

  const { pageSize = DEFAULT_PAGE_SIZE } = getElementData(documentNode);
  const pageGroups = [] as Document['pageGroups'];

  for (const pageGroupNode of pageGroupNodes) {
    const { pages: pagesData } = getElementData(pageGroupNode);

    const content = createContent();

    const elements = extendValuesByPageType<{
      header: undefined | TreeElement;
      footer: undefined | TreeElement;
    }>({
      header: undefined,
      footer: undefined,
    });

    pageGroupNode.children.forEach((child) => {
      if (isElementOfType(child, ['header', 'footer'])) {
        const data = getElementData(child);
        elements[data.pageType][getElementType(child)] = child;
      } else {
        content.children.push(child);
      }
    });

    const pagesDataExpanded = extendValuesByPageType<
      RequiredDeep<ElementData<'pagegroup'>>['pages'][PageType]
    >(
      {
        margins: DEFAULT_PAGE_MARGINS,
        disableHeader: false,
        disableFooter: false,
      },
      pagesData,
    );

    const elementsExpanded = extendValuesByPageType(
      { header: undefined, footer: undefined },
      elements,
    );

    const page = mapPageTypes((pageType) => {
      const pageData = pagesDataExpanded[pageType];
      const elements = elementsExpanded[pageType];
      return {
        margins: pageData.margins,
        header: pageData.disableHeader
          ? undefined
          : elements.header
          ? // TODO: data should be handled by element.setData
            createContent({
              data: { pageType, elementType: 'header' },
              children: [elements.header],
            })
          : undefined,
        footer: pageData.disableFooter
          ? undefined
          : elements.footer
          ? createContent({
              data: { pageType, elementType: 'footer' },
              children: [elements.footer],
            })
          : undefined,
      };
    });

    pageGroups.push({ page, content });
  }

  return {
    pageSize,
    pageGroups,
  };
};
