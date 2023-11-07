import { type Element, type Root, type Text } from 'hast';

type TreeData = Record<string, unknown>;

export type TreeNode<
  TData extends TreeData = TreeData,
  TChildData extends TreeData = TData,
> = TreeRoot<TData, TChildData> | TreeChild<TData, TChildData>;

export type TreeRoot<
  TData extends TreeData = TreeData,
  TChildData extends TreeData = TData,
> = Omit<Root, 'children' | 'data'> & {
  children: Array<TreeChild<TChildData>>;
  data: Record<string, never> | TData;
};

export type TreeChild<
  TData extends TreeData = TreeData,
  TChildData extends TreeData = TData,
> = TreeElement<TData, TChildData> | TreeText;

export type TreeElement<
  TData extends TreeData = TreeData,
  TChildData extends TreeData = TData,
> = Omit<Element, 'children' | 'data'> & {
  children: Array<TreeElement<TChildData>>;
  data: Record<string, never> | TData;
};

export type TreeText = Omit<Text, 'data'> & { data: Record<string, never> };

export const HTML_DATA_ATTRIBUTE = `data-ast-tree-data`;

export const treeDataToAttributes = (
  data: TreeData,
): Record<string, string> => ({
  [HTML_DATA_ATTRIBUTE]: encodeURI(JSON.stringify(data)),
});

export const attributesToTreeData = (
  attributes: Record<string, unknown>,
): TreeData =>
  attributes[HTML_DATA_ATTRIBUTE] &&
  JSON.parse(decodeURI(attributes[HTML_DATA_ATTRIBUTE] as string));
