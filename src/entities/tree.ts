import type * as Hast from 'hast';
import { type Simplify } from 'type-fest';
import { type JsonObject } from 'type-fest';
import { toDom } from 'hast-util-to-dom';
import { ID_PREFIX } from './primitives.js';

type Data = {
  elementType: string;
  options: Record<string, unknown>;
};

type ExtendNode<TNode> = TNode extends unknown
  ? Simplify<
      Omit<TNode, 'data' | 'children'> &
        ('data' extends keyof TNode ? { data: Data } : unknown) &
        ('children' extends keyof TNode
          ? { children: Array<TreeChild> }
          : unknown)
    >
  : never;

export type TreeRoot = ExtendNode<Hast.Root>;

export type TreeElement = ExtendNode<Hast.Element>;

export type TreeText = ExtendNode<Hast.Text>;

export type TreeChild = TreeElement | TreeText;

export type TreeNode = TreeRoot | TreeElement | TreeText;

export type TreeParent = TreeElement & { children: Array<TreeChild> };

const HTML_TREE_OPTIONS_ATTRIBUTE = `data-${ID_PREFIX}-data`;

const HTML_TREE_TYPE_ATTRIBUTE = `data-${ID_PREFIX}-type`;

export const dataToHtmlAttributes = (
  data: Data,
): Record<`data-${Lowercase<string>}`, string> => ({
  [HTML_TREE_TYPE_ATTRIBUTE]: data.elementType,
  [HTML_TREE_OPTIONS_ATTRIBUTE]: encodeURI(JSON.stringify(data.options)),
});

export const htmlAttributesToData = (
  attributes: Record<string, unknown>,
): Data => {
  const elementType = attributes[HTML_TREE_TYPE_ATTRIBUTE] as string;
  if (elementType) {
    return {
      elementType,
      options: JSON.parse(
        decodeURI(attributes[HTML_TREE_OPTIONS_ATTRIBUTE] as string),
      ),
    };
  }
  return {
    elementType: 'htmltag',
    options: {},
  };
};

export const domElementToData = (element: Element): Data =>
  htmlAttributesToData({
    [HTML_TREE_TYPE_ATTRIBUTE]: element.getAttribute(HTML_TREE_TYPE_ATTRIBUTE),
    [HTML_TREE_OPTIONS_ATTRIBUTE]: element.getAttribute(
      HTML_TREE_OPTIONS_ATTRIBUTE,
    ),
  });

export const getElementOptions = <T extends JsonObject>(element: TreeElement) =>
  element.data.options as T;

export const getElementType = (element: TreeChild) => element.data.elementType;

export const findElementsDom = (
  node: Element,
  elementType: Data['elementType'],
) =>
  Array.from(
    node.querySelectorAll(`[${HTML_TREE_TYPE_ATTRIBUTE}="${elementType}"]`),
  ).map((element) => {
    return { element, data: domElementToData(element) };
  });

const isElement = (value: any): value is TreeElement =>
  value.type === 'element';

const isParent = (value: any): value is TreeParent => 'children' in value;

export const findElement = (
  node: TreeNode,
  callback: (node: TreeElement, parentNode?: TreeNode) => boolean,
  parentNode?: TreeNode,
): undefined | TreeElement => {
  if (isElement(node) && callback(node, parentNode)) {
    return node;
  }
  if (isParent(node)) {
    return node.children.find((child) => findElement(child, callback, node)) as
      | undefined
      | TreeElement;
  }
  return undefined;
};

export const findElements = (
  node: TreeNode,
  callback: (node: TreeElement, parentNode?: TreeNode) => boolean,
  parentNode?: TreeNode,
): Array<TreeElement> => {
  if (isElement(node) && callback(node, parentNode)) {
    return [node];
  }
  if (isParent(node)) {
    return node.children.flatMap((child) =>
      findElements(child, callback, node),
    );
  }
  return [];
};

export const extractElements = (
  node: TreeNode,
  callback: (node: TreeElement, parentNode?: TreeNode) => boolean,
  parentNode?: TreeNode,
): Array<TreeElement> => {
  if (isElement(node) && callback(node, parentNode)) {
    if (parentNode && 'children' in parentNode) {
      parentNode.children.splice(parentNode.children.indexOf(node), 1);
    }
    return [node];
  }
  if (isParent(node)) {
    return [...node.children].flatMap((child) => {
      return extractElements(child, callback, node);
    });
  }
  return [];
};

export const flatMapNodes = <T>(
  node: TreeNode,
  callback: (
    node: TreeNode,
    mapChildren: (node: TreeNode) => Array<T>,
    parentNode?: TreeNode,
  ) => T | Array<T>,
  parentNode?: TreeNode,
): Array<T> => {
  const mapChildren = (node: TreeNode) => {
    if (isParent(node)) {
      return node.children.flatMap((child) =>
        flatMapNodes(child, callback, node),
      );
    }
    return [];
  };
  const result = callback(node, mapChildren, parentNode);
  return Array.isArray(result) ? result : [result];
};

export const treeToRoot = (node: TreeNode | Array<TreeChild>): TreeRoot => {
  if (Array.isArray(node)) {
    return {
      type: 'root',
      data: { elementType: 'root', options: {} },
      children: node,
    };
  }
  if (node.type === 'root') {
    return node;
  }
  return {
    type: 'root',
    data: { elementType: 'root', options: {} },
    children: [node],
  };
};

export const treeToFragment = (
  tree: null | undefined | false | TreeNode,
): DocumentFragment =>
  tree
    ? (toDom(treeToRoot(tree) as Hast.Nodes, {
        fragment: true,
      }) as DocumentFragment)
    : document.createDocumentFragment();
