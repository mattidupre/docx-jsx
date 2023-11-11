import { type IfAny } from 'type-fest';
import {
  type TreeElement,
  type TreeNode,
  treeDataToAttributes,
  // type ArrayOfAll,
} from 'src/utils';
import {
  type TextOptions,
  type PageMargins,
  type PageSize,
  type PageType,
} from './options';

type ElementDataByType = {
  document: {
    pageSize?: PageSize;
  };
  pagegroup: {
    pages: Partial<
      Record<
        PageType,
        {
          margins: Partial<PageMargins>;
          disableHeader: boolean;
          disableFooter: boolean;
        }
      >
    >;
    pageGroupId: string;
  };
  paragraph: TextOptions;
  textrun: TextOptions;
  header: { pageType: PageType };
  footer: { pageType: PageType };
};

export type ElementType = keyof ElementDataByType;

export type ElementData<TType extends ElementType = any> = IfAny<
  TType,
  Record<string, unknown>,
  ElementDataByType[TType]
>;

// const ELEMENT_TYPES: ArrayOfAll<ElementType> = [
//   'document',
//   'pagegroup',
//   'paragraph',
//   'textrun',
//   'header',
//   'footer',
// ];

export type Element<TType extends ElementType = any> = TreeElement<
  IfAny<
    TType,
    Record<string, unknown>,
    {
      type: TType;
      data: ElementData<TType>;
    }
  >,
  Record<string, unknown>
>;

export const elementDataToAttributes = <TType extends ElementType>(
  type: TType,
  data: ElementData<TType>,
) =>
  treeDataToAttributes({
    type,
    data,
  });

export const getElementType = <TNode extends TreeNode>(node: TNode) =>
  node?.data?.type as TNode extends Element<infer T> ? T : undefined | string;

export const getElementData = <TNode extends TreeNode>(node: TNode) =>
  node?.data?.data as TNode extends Element<infer T> ? ElementData<T> : unknown;

export const isElementOfType = <TType extends ElementType>(
  value: any,
  type: TType | ReadonlyArray<TType>,
): value is Element<TType> => {
  const elementType = getElementType(value);
  if (!elementType) {
    return false;
  }
  if (!(Array.isArray(type) ? type : [type]).includes(elementType)) {
    return false;
  }
  return true;
};
