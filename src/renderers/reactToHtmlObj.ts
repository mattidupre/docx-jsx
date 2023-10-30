import { type ReactElement } from 'react';
import { type Node, type Parent } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { reactToAst } from 'src/renderers/reactToAst';

const mapPageGroups = (element: Parent) => {
  if (element.elementType === 'pagegroup') {
    const { pageGroupId } = element.elementData;
    const pageTypes = {};
    let contentHtml = '';

    element.children.forEach((child) => {
      if (['header', 'footer'].includes(child.elementType)) {
        const { pageType } = child.elementData;
        if (!pageTypes[pageType]) {
          pageTypes[pageType] = {};
        }
        pageTypes[pageType][`${child.elementType}Html`] = toHtml(child);
      } else {
        contentHtml += toHtml(child);
      }
    });

    return {
      id: pageGroupId,
      pageTypes,
      contentHtml,
    };
  }

  return element.children.map((child) => {
    const parsedChild = mapPageGroups(child);
    if (Array.isArray(parsedChild)) {
      return parsedChild.flat();
    }
    return [parsedChild];
  });
};

export const reactToHtmlObj = async (rootElement: ReactElement) => {
  const ast = await reactToAst(rootElement);

  const htmlObj = {
    pageGroups: mapPageGroups(ast).flat(),
  };
  return htmlObj;
};
