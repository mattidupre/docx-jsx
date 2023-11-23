import {
  type TreeRoot,
  flatMapNodes,
  type TreeNode,
  type TreeChild,
  type TreeParent,
  htmlAttributesToData,
} from '../../entities/tree.js';
import { fromHtml } from 'hast-util-from-html';
import { omit, cloneDeep } from 'lodash-es';

// TODO: use Hast map to improve types.

// TODO: Move to entities?

export const htmlToTree = (html: string) => {
  const hast = fromHtml(html, { fragment: true });
  return flatMapNodes(hast as TreeNode, (node, mapChildren) => {
    const newNode = cloneDeep(omit(node, 'children'));
    newNode.data = htmlAttributesToData((node as any).properties ?? {});
    if ('children' in node) {
      (newNode as TreeParent).children = mapChildren(node) as Array<TreeChild>;
    }
    return newNode as TreeNode;
  })[0] as TreeRoot;
};
