import { type TreeRoot } from 'src/utils';
import { toHtml } from 'hast-util-to-html';

export const treeToMarkup = (tree: TreeRoot) => toHtml(tree);
