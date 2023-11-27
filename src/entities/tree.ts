import type * as Hast from 'hast';
import { type Simplify } from 'type-fest';
import { type JsonObject } from 'type-fest';
import { ID_PREFIX } from './primitives.js';
import { fromHtml } from 'hast-util-from-html';
import { cloneDeep, omit } from 'lodash-es';

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

export const isTreeRoot = (value: any): value is TreeRoot =>
  value?.type === 'root';

export type TreeElement = ExtendNode<Hast.Element>;

export const isTreeElement = (value: any): value is TreeElement =>
  value?.type === 'element';

export type TreeText = ExtendNode<Hast.Text>;

export const isTreeText = (value: any): value is TreeText =>
  value?.type === 'text';

export type TreeChild = TreeElement | TreeText;

export const isTreeChild = (value: any): value is TreeChild =>
  isTreeElement(value) || isTreeText(value);

export type TreeNode = TreeRoot | TreeElement | TreeText;

export type TreeParent = TreeElement & { children: Array<TreeChild> };

export const isTreeParent = (value: any): value is TreeParent =>
  (isTreeRoot(value) || isElement(value)) && 'children' in value;

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

export const findElement = (
  node: TreeNode,
  callback: (node: TreeElement, parentNode?: TreeNode) => boolean,
  parentNode?: TreeNode,
): undefined | TreeElement => {
  if (isElement(node) && callback(node, parentNode)) {
    return node;
  }
  if (isTreeParent(node)) {
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
  if (isTreeParent(node)) {
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
  if (isTreeParent(node)) {
    return [...node.children].flatMap((child) => {
      return extractElements(child, callback, node);
    });
  }
  return [];
};

export const flatMapNodes = <TMappedNode, TContext>(
  node: TreeNode,
  context: TContext,
  callback: (arg: {
    node: TreeNode;
    context: TContext;
    mapChildren: (context: TContext) => Array<TMappedNode>;
  }) => TMappedNode | Array<TMappedNode>,
): Array<TMappedNode> => {
  const result = callback({
    node,
    context,
    mapChildren: (childContext) => {
      if (isTreeParent(node)) {
        return node.children.flatMap((child) =>
          flatMapNodes(child, childContext, callback),
        );
      }
      return [];
    },
  });
  return Array.isArray(result) ? result : [result];
};

export const treeToRoot = (
  rootElementType: string,
  node: TreeNode | Array<TreeChild>,
): TreeRoot => {
  if (isTreeRoot(node)) {
    return {
      type: 'root',
      data: {
        elementType: rootElementType,
        options: node?.data?.options ?? {},
      },
      children: node.children ?? [],
    };
  }
  return {
    type: 'root',
    data: { elementType: rootElementType, options: {} },
    children: Array.isArray(node) ? node : [node],
  };
};

export const htmlToTree = (html: string) => {
  const hast = fromHtml(html, { fragment: true }) as TreeNode;
  return flatMapNodes(hast, {}, ({ node, mapChildren }) => {
    const newNode = cloneDeep(omit(node, 'children')) as TreeNode;
    if (isTreeRoot(node) || isTreeElement(node)) {
      newNode.data = htmlAttributesToData((node as any).properties ?? {});
    }
    if (isTreeParent(node)) {
      (newNode as TreeParent).children = mapChildren(node) as Array<TreeChild>;
    }
    return newNode;
  })[0] as TreeRoot;
};
