import { ID_PREFIX } from './primitives';
import type * as Hast from 'hast';
import { type Simplify } from 'type-fest';
import { type JsonObject } from 'type-fest';
import { toDom } from 'hast-util-to-dom';

type Data = {
  elementType: string;
  options: Record<string, unknown>;
};

type ExtendNode<TNode> = TNode extends unknown
  ? Simplify<
      Omit<TNode, 'data' | 'children'> &
        ('data' extends keyof TNode ? { data: Data } : unknown) &
        ('children' extends keyof TNode
          ? { children: Array<ExtendNode<Hast.Element | Hast.Text>> }
          : unknown)
    >
  : never;

export type TreeRoot = Omit<Hast.Root, 'children'> & {
  children: Array<TreeChild>;
};

export type TreeElement = ExtendNode<Hast.Element>;

export type TreeText = ExtendNode<Hast.Text>;

export type TreeChild = TreeElement | TreeText;

export type TreeNode = TreeRoot | TreeElement | TreeText;

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

export const getElementOptions = <T extends JsonObject>(element: TreeElement) =>
  element.data.options as T;

export const getElementType = (element: TreeChild) => element.data.elementType;

const isElement = (value: any): value is TreeElement =>
  value.type === 'element';

const isParent = (value: any): value is { children: Array<TreeChild> } =>
  'children' in value;

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
      data: {},
      children: node,
    };
  }
  if (node.type === 'root') {
    return node;
  }
  return {
    type: 'root',
    data: {},
    children: [node],
  };
};

export const treeToFragment = (
  tree: null | undefined | false | TreeNode,
): DocumentFragment =>
  tree
    ? (toDom(treeToRoot(tree), { fragment: true }) as DocumentFragment)
    : document.createDocumentFragment();
