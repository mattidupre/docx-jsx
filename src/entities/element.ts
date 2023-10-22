import { type ReactNode, type ReactElement } from 'react';
import {
  type ISectionOptions,
  type IDocumentOptions,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';

export type IntrinsicType =
  | 'document'
  | 'section'
  | 'header'
  | 'footer'
  | 'paragraph'
  | 'textrun'
  | 'table';

export type IntrinsicElementProps<TNode = ReactNode> = {
  document: Omit<IDocumentOptions, 'sections'> & {
    children: TNode;
  };
  section: Omit<ISectionOptions, 'children' | 'headers' | 'footers'> & {
    children: TNode;
    headers?: {
      default?: TNode;
      first?: TNode;
      even?: TNode;
    };
    footers?: {
      default?: TNode;
      first?: TNode;
      even?: TNode;
    };
  };
  header: {
    children: TNode;
  };
  footer: {
    children: TNode;
  };
  paragraph: Omit<IParagraphOptions, 'children'> & {
    children: TNode;
  };
  textrun: Omit<IRunOptions, 'children'> & {
    children?: TNode;
  };
  table: never;
};

export type IntrinsicElement<
  TType extends IntrinsicType = IntrinsicType,
  TProps extends IntrinsicElementProps = IntrinsicElementProps,
> = TType extends unknown ? ReactElement<TProps, TType> : never;

export const isAnyElement = (value: any): value is ReactElement => {
  return value?.type !== undefined;
};

export const isIntrinsicElement = <TType extends IntrinsicType = IntrinsicType>(
  value: any,
  allowTypes?: ReadonlyArray<TType>,
): value is IntrinsicElement<TType> => {
  if (!isAnyElement(value)) {
    return false;
  }
  if (typeof value.type !== 'string') {
    return false;
  }
  if (allowTypes === undefined) {
    return true;
  }
  if (!allowTypes.includes(value.type as any)) {
    throw new TypeError(
      `Expected ${
        value?.type ?? value
      } to be Intrinsic Element of type ${allowTypes.join(' or ')}.`,
    );
  }
  return true;
};

export function assertIntrinsicElement<
  TType extends IntrinsicType = IntrinsicType,
>(
  value: unknown,
  allowTypes?: ReadonlyArray<TType>,
): asserts value is IntrinsicElement<TType> {
  if (!isIntrinsicElement(value, allowTypes)) {
    throw new TypeError(
      `Invalid intrinsic element "${(value as any)?.type ?? value}".`,
    );
  }
}

export const asIntrinsicElement = <TType extends IntrinsicType = IntrinsicType>(
  value: unknown,
  allowTypes?: ReadonlyArray<TType>,
): IntrinsicElement<TType> => {
  assertIntrinsicElement(value, allowTypes);
  return value;
};

export const isComponentElement = (
  value: any,
): value is ReactElement<any, (...args: any) => any> =>
  isAnyElement(value) && typeof value.type === 'function';
