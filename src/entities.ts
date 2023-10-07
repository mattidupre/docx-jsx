import {
  type ReactElement,
  type ReactNode,
  type FunctionComponentElement,
  type ExoticComponent,
  createElement,
  isValidElement,
} from 'react';
import {
  type ISectionOptions,
  type IDocumentOptions,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import { asArray } from 'src/utils';

// Nullish: values omitted in the output.
// Stringish: values that are coerced into strings in the output.
// AnyElement / ReactElement: object representing a Component or Intrinsic.
// IntrinsicElement: an element that maps to an output value, e.g., div or textrun.
// OtherElement: a React Fragment or Exotic Component, just noop and return children.

export type RenderType = 'docx' | 'react' | 'ast';

export type Nullish = true | false | null | undefined;
export const isNullish = (value: any): value is Nullish =>
  value === null || value === undefined || value === true || value === false;

export type Stringish = string | number;
export const isStringish = (value: any): value is Stringish =>
  typeof value === 'string' || typeof value === 'number';

export type IntrinsicProps = {
  document: Omit<IDocumentOptions, 'sections'> & {
    sections: ChildrenNode<'section'>;
  };
  section: Omit<ISectionOptions, 'children' | 'headers' | 'footers'> & {
    children: ChildrenNode<'paragraph' | 'table'>;
    headers?: Partial<
      Record<keyof ISectionOptions['headers'], ChildNode<'header'>>
    >;
    footers?: Partial<
      Record<keyof ISectionOptions['footers'], ChildNode<'footer'>>
    >;
  };
  header: { children: ChildrenNode<'paragraph' | 'table'> };
  footer: { children: ChildrenNode<'paragraph' | 'table'> };
  paragraph: Omit<IParagraphOptions, 'children'> & {
    children: ChildrenNode<'textrun'>;
  };
  textrun: Omit<IRunOptions, 'children'> & {
    children: ChildrenNode<'textrun'>;
  };
  table: never;
};

export type IntrinsicType = keyof IntrinsicProps;

export type IntrinsicElement<
  TType extends IntrinsicType = IntrinsicType,
  TProps extends IntrinsicProps = IntrinsicProps,
> = TType extends unknown ? ReactElement<TProps, TType> : never;

export const isIntrinsicElement = <TType extends IntrinsicType>(
  value: any,
  allowTypes?: ReadonlyArray<TType>,
): value is IntrinsicElement<TType> => {
  if (!isValidElement(value)) {
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

export const asIntrinsicElement = <TType extends IntrinsicType>(
  value: IntrinsicElement,
  allowTypes?: ReadonlyArray<TType>,
) => {
  if (!isIntrinsicElement(value, allowTypes)) {
    if (!allowTypes) {
      throw new TypeError('Expected value to be an Intrinsic Element.');
    }
    throw new TypeError(
      `Expected value to be an Intrinsic Element of type ${asArray(
        allowTypes,
      ).join(' or ')}.`,
    );
  }
  return value as IntrinsicElement<TType>;
};

export const createIntrinsicElement = <
  TType extends IntrinsicType,
  TProps extends IntrinsicProps,
>(
  type: TType,
  props: TProps,
) => createElement(type, props);

export { FunctionComponentElement as ComponentElement };

export const isComponentElement = (
  value: any,
): value is FunctionComponentElement<any> =>
  isValidElement(value) && typeof value.type === 'function';

export type OtherElement = ReactElement<
  { children?: ReactNode },
  ExoticComponent
>;
export const isOtherElement = (value: any): value is OtherElement =>
  isValidElement(value) &&
  !isComponentElement(value) &&
  !isIntrinsicElement(value);

declare const CHILD_META_KEY: unique symbol;

type BrandChild<
  TIntrinsicType extends IntrinsicType,
  TChildType extends 'child' | 'children',
> = TIntrinsicType & {
  [CHILD_META_KEY]?: {
    TChildType: TChildType;
    TIntrinsicType: TIntrinsicType;
  };
};

type IsBrandedChild<TValue> = typeof CHILD_META_KEY extends keyof TValue
  ? true
  : false;

type UnbrandChild<TValue> = IsBrandedChild<TValue> extends true
  ? Omit<TValue, typeof CHILD_META_KEY>
  : TValue;

type GetIntrinsicType<TValue> = TValue extends BrandChild<
  infer TIntrinsicType,
  any
>
  ? TIntrinsicType
  : never;

type IsChildChildren<TValue> = TValue extends BrandChild<
  IntrinsicType,
  'children'
>
  ? true
  : false;

export type ChildElement<TIntrinsicType extends IntrinsicType = IntrinsicType> =
  (undefined | IntrinsicElement<TIntrinsicType>) &
    BrandChild<TIntrinsicType, 'child'>;

export type ChildNode<TIntrinsicType extends IntrinsicType = IntrinsicType> =
  ReactNode & ChildElement<TIntrinsicType>;

export type ChildrenElement<
  TIntrinsicType extends IntrinsicType = IntrinsicType,
> = ReadonlyArray<IntrinsicElement<TIntrinsicType>> &
  BrandChild<TIntrinsicType, 'children'>;

export type ChildrenNode<TIntrinsicType extends IntrinsicType = IntrinsicType> =
  ReactNode & ChildrenElement<TIntrinsicType>;

type ValueOf<T extends Record<string, unknown>> = T[keyof T];

type ReplaceChild<
  TValue,
  TDictionary extends Record<IntrinsicType, any>,
> = IsBrandedChild<TValue> extends true
  ? GetIntrinsicType<TValue> extends keyof TDictionary
    ? IsChildChildren<TValue> extends true
      ? ChildrenElement<GetIntrinsicType<TValue>> &
          ReadonlyArray<
            ValueOf<{
              [K in GetIntrinsicType<TValue>]: TDictionary[K];
            }>
          >
      : ChildElement<GetIntrinsicType<TValue>> &
          ValueOf<{
            [K in GetIntrinsicType<TValue>]: TDictionary[K];
          }>
    : never
  : never;

export type ReplaceChildDeep<
  TValue,
  TDictionary extends Record<IntrinsicType, any>,
> = IsBrandedChild<TValue> extends true
  ? ReplaceChild<TValue, TDictionary>
  : TValue extends ReadonlyArray<infer T>
  ? ReadonlyArray<ReplaceChildDeep<T, TDictionary>>
  : TValue extends Record<string, any>
  ? { [K in keyof TValue]: ReplaceChildDeep<TValue[K], TDictionary> }
  : TValue;

export type RenderContext<
  TIntrinsicType extends IntrinsicType = IntrinsicType,
> = {
  type: TIntrinsicType;

  renderChild: <T1 extends IntrinsicType, T2 extends T1>(
    node: ChildNode<T1>,
    types: ReadonlyArray<T2>,
  ) => undefined | BrandChild<T1, 'child'>;

  renderChildren: <T1 extends IntrinsicType, T2 extends T1>(
    node: ChildrenNode<T1>,
    types: ReadonlyArray<T2>,
  ) => ReadonlyArray<BrandChild<T1, 'children'>>;
};

export type Parser<TIntrinsicType extends IntrinsicType = IntrinsicType> = (
  options: ReplaceChildDeep<
    IntrinsicProps[IntrinsicType],
    Record<IntrinsicType, any>
  >,
  context: RenderContext<TIntrinsicType>,
) => unknown;
