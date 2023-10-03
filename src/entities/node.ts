import { type Props } from 'src/utils';
import {
  type ReactElement,
  type ReactNode,
  type FunctionComponentElement,
  type ExoticComponent,
  createElement,
  isValidElement,
} from 'react';
import { type SchemaName, type SchemaProps } from './schema';
import { asArray } from 'src/utils';

// Nullish: values omitted in the output.
// Stringish: values that are coerced into strings in the output.
// AnyElement / ReactElement: object representing a Component or Intrinsic.
// IntrinsicElement: an element that maps to an output value, e.g., Dev or TextRun.
// OtherElement: a React Fragment or Exotic Component, just noop and return children.

export { ReactElement as AnyElement };
export const isAnyElement = (value: any): value is ReactElement =>
  isValidElement(value);

export type Nullish = true | false | null | undefined;
export const isNullish = (value: any): value is Nullish =>
  value === null || value === undefined || value === true || value === false;

export type Stringish = string | number;
export const isStringish = (value: any): value is Stringish =>
  typeof value === 'string' || typeof value === 'number';

type IntrinsicKey =
  | undefined
  | SchemaName
  | IntrinsicElement
  | ReadonlyArray<SchemaName>
  | ReadonlyArray<IntrinsicElement>;

export type IntrinsicType<TType extends IntrinsicKey = undefined> = [
  TType,
] extends [undefined]
  ? SchemaName
  : TType extends ReadonlyArray<infer T extends SchemaName | IntrinsicElement>
  ? IntrinsicType<T>
  : TType extends SchemaName
  ? TType
  : TType extends IntrinsicElement<infer T extends SchemaName>
  ? T
  : never;

export type IntrinsicProps<TType extends IntrinsicKey> =
  SchemaProps[IntrinsicType<TType>];

export type IntrinsicElement<TType extends IntrinsicKey = undefined> =
  TType extends SchemaName
    ? ReactElement<SchemaProps<TType>, TType>
    : IntrinsicElement<IntrinsicType<TType>>;

export const isIntrinsicElement = <TType extends IntrinsicKey>(
  value: any,
  type?: TType,
): value is IntrinsicElement<TType> => {
  if (!isValidElement(value)) {
    return false;
  }
  if (typeof value.type !== 'string') {
    return false;
  }
  if (type === undefined) {
    return true;
  }
  const typeArr = Array.isArray(type) ? type : [type];
  if (!typeArr.includes(value.type as any)) {
    throw new TypeError(
      `Expected ${
        value?.type ?? value
      } to be Intrinsic Element of type ${typeArr.join(' or ')}.`,
    );
  }
  return true;
};

export const asIntrinsicElement = <TTypes extends IntrinsicKey>(
  value: IntrinsicElement,
  allowTypes?: TTypes,
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
  return value as IntrinsicElement<TTypes>;
};

export const createIntrinsicElement = <TType extends SchemaName>(
  type: TType,
  props: SchemaProps<TType>,
): IntrinsicElement<TType> => {
  const { children, ...restProps } = props as any;
  return createElement(type, restProps, children) as any;
};

export { FunctionComponentElement as ComponentElement };
export const isComponentElement = (
  value: any,
): value is FunctionComponentElement<Props> =>
  isAnyElement(value) && typeof value.type === 'function';

export type OtherElement = ReactElement<
  { children?: ReactNode },
  ExoticComponent
>;
export const isOtherElement = (value: any): value is OtherElement =>
  isAnyElement(value) &&
  !isComponentElement(value) &&
  !isIntrinsicElement(value);

export { ReactNode as AnyNode };
