import { decodeAstDataAttributes } from 'src/entities';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { CONTINUE, SKIP, visit } from 'unist-util-visit';

export const htmlToPdfOptions = (html: string) => {
  const ast = fromHtml(html);

  const pagesGroups: Array<Record<string, any>> = [];
  visit(ast, function (node) {
    const { elementType, pagesGroupId } =
      decodeAstDataAttributes(node.properties) ?? {};
    if (elementType === 'pagesGroup') {
      const pageTypes = {};
      let contentHtml = '';
      node.children.forEach((childNode) => {
        const { pageType, elementType: childElementType } =
          decodeAstDataAttributes(childNode.properties) ?? {};
        if (['header', 'footer'].includes(childElementType)) {
          if (!pageTypes[pageType]) {
            pageTypes[pageType] = {};
          }

          pageTypes[pageType][`${childElementType}Html`] = toHtml(childNode);
        } else {
          contentHtml += toHtml(childNode);
        }
      });
      pagesGroups.push({
        id: pagesGroupId,
        pageTypes,
        contentHtml,
      });
      return SKIP;
    }
    return CONTINUE;
  });
  return { pagesGroups };
};
