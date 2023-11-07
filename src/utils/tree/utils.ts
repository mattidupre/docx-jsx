import { type TreeNode, type TreeRoot } from './entities';

export const findTreeNodes = <TNode extends TreeNode = TreeNode>(
  node: TreeNode,
  callback: (node: TreeNode) => boolean,
): Array<TNode> => {
  if (callback(node)) {
    return [node] as Array<TNode>;
  }
  if ('children' in node) {
    return node.children.flatMap((child) => findTreeNodes(child, callback));
  }
  return [];
};
