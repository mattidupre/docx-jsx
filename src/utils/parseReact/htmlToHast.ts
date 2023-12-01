import type * as Hast from 'hast';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';

const mapTree = (tree: Hast.Node) => {
  if (tree.type !== 'root' && tree.type !== 'element' && tree.type !== 'text') {
    return [];
  }

  if ('children' in tree) {
    tree.children = (tree as Hast.Parent).children.flatMap(mapTree);
  }

  return tree;
};

export const htmlToHast = (html: string) =>
  mapTree(fromHtmlIsomorphic(html, { fragment: true }));
