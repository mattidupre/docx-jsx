import { type ReactElement } from 'react';
import { toHtml } from 'hast-util-to-html';
import { reactToAst } from 'src/renderers/reactToAst';
import {
  type ReactAst,
  type PageType,
  type PageOptions,
  type PageTypesOptions,
  type PagesGroupOptions,
  type DocumentOptions,
} from 'src/entities';

const astToHtml = (element: ReactAst) => toHtml(element as any);

/**
 * Iterate recursively through AST to find PageGroup elements.
 * Then check immediate children for <header> and <footer> elemenets.
 */
const mapPageGroups = (element: ReactAst): ReadonlyArray<PagesGroupOptions> => {
  if (element.elementType === 'pagegroup') {
    const pageGroupId = element.elementData!.pageGroupId as string;
    const pageTypes: PageTypesOptions = {};
    let contentHtml = '';

    element.children!.forEach((child) => {
      if (child.elementType === 'header' || child.elementType === 'footer') {
        const pageType = child.elementData!.pageType as PageType;
        const pageOptions: Partial<PageOptions> =
          pageTypes[pageType] ?? (pageTypes[pageType] = {});
        pageOptions[`${child.elementType}Html`] = astToHtml(child);
      } else {
        contentHtml += astToHtml(child);
      }
    });

    return [
      {
        id: pageGroupId,
        pageTypes,
        contentHtml,
      },
    ];
  }

  if (!element.children) {
    return [];
  }

  return element.children.flatMap((child) => mapPageGroups(child));
};

export const reactToHtmlObj = async (
  rootElement: ReactElement,
): Promise<DocumentOptions> => ({
  pageGroups: mapPageGroups(await reactToAst(rootElement)).flat(),
});
