import { ID_PREFIX } from '../../entities/primitives';
import {
  flatMapNodes,
  type TreeNode,
  isTreeRoot,
  isTreeText,
  isTreeElement,
} from '../../entities/tree';
import { kebabCase } from 'lodash-es';

// TODO: call this treeContentToDom?
export const treeContentToDom = (
  tree: null | undefined | false | TreeNode,
): DocumentFragment => {
  const root = document.createDocumentFragment();
  if (!tree) {
    return root;
  }
  const rootChildren = flatMapNodes<HTMLElement | Text, unknown>(
    tree,
    {},
    ({ node, mapChildren }) => {
      if (isTreeRoot(node)) {
        return mapChildren(node);
      }
      if (isTreeText(node)) {
        return document.createTextNode(node.value);
      }
      if (!isTreeElement(node)) {
        throw new TypeError('Invalid element');
      }
      const {
        tagName,
        properties,
        data: { elementType, options },
      } = node;
      const domNode = document.createElement(tagName);
      domNode.classList.add(elementType);

      for (const property in properties) {
        // TODO: Better types at TreeNode level
        domNode.setAttribute(property, properties[property] as string);
      }

      for (const option in options) {
        const value = options[option];
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new TypeError('Invalid option value');
        }
        domNode.style.setProperty(
          `--${kebabCase(ID_PREFIX + '-' + option)}`,
          String(options[option]),
        );
      }

      domNode.append(...mapChildren(node));
      return domNode;
    },
  );
  root.append(...rootChildren);
  return root;
};
