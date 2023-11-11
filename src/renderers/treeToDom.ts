import { type TreeRoot } from 'src/utils';
import { toDom } from 'hast-util-to-dom';

export const treeToDom = (tree: TreeRoot) =>
  toDom(tree, { fragment: true }) as DocumentFragment;

// export const treeToDomMemoizer = () => {
//   const cache = new Map<string, HTMLElement>();
//   return (tree: TreeRoot) => {
//     const markup = toHtml(tree);
//     if (cache.has(markup)) {

//     }
//   }
// }
