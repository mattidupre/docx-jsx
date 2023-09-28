import { isObject, type Props } from 'src/utils';
import {
  type ReactElement,
  type ReactNode,
  type FunctionComponentElement,
  type ExoticComponent,
  createElement,
} from 'react';

// Nullish: values omitted in the output.
// Stringish: values that are coerced into strings in the output.
// AnyElement / ReactElement: object representing a Component or Intrinsic.
// IntrinsicElement: an element that maps to an output value, e.g., Dev or TextRun.
// OtherElement: a React Fragment or Exotic Component, just noop and return children.
// Child: a single rendered value, either IntrinsicElement or a coerced string.
// Children: an array Child values.
// ChildNode: a Child or Children.

export type RenderEnvironment = null | 'test' | 'react' | 'docx';

export { ReactElement as AnyElement };
export const isAnyElement = (value: any): value is ReactElement =>
  isObject(value) && 'props' in value && 'type' in value;

export type Nullish = true | false | null | undefined;
export const isNullish = (value: any): value is Nullish =>
  value === null || value === undefined || value === true || value === false;

export type Stringish = string | number;
export const isStringish = (value: any): value is Stringish =>
  typeof value === 'string' || typeof value === 'number';

export { FunctionComponentElement as ComponentElement };
export const isComponentElement = (
  value: any,
): value is FunctionComponentElement<Props> =>
  isAnyElement(value) && typeof value.type === 'function';

export type IntrinsicType = string;
export type IntrinsicProps<TType extends IntrinsicType = IntrinsicType> = Props;
export type IntrinsicElement<TType extends IntrinsicType = IntrinsicType> =
  ReactElement<IntrinsicProps<TType>, TType>;
export const isIntrinsicElement = <TType extends undefined | IntrinsicType>(
  value: any,
  type?: TType,
): value is TType extends IntrinsicType
  ? IntrinsicElement<TType>
  : IntrinsicElement => {
  if (!isObject(value) || typeof value.type !== 'string') {
    return false;
  }
  if (
    type !== undefined &&
    typeof value.type === 'string' &&
    value.type.toLowerCase() !== type.toLowerCase()
  ) {
    return false;
  }
  return true;
};
export const createIntrinsicString = (
  value: Stringish,
): IntrinsicElement<'primitive'> => {
  if (!isStringish(value)) {
    throw new Error('Value must be stringish.');
  }
  return createElement('primitive', {}, value.toString()) as any;
};

export type OtherElement = ReactElement<
  { children?: ReactNode },
  ExoticComponent
>;
export const isOtherElement = (value: any): value is OtherElement =>
  isAnyElement(value) &&
  !isComponentElement(value) &&
  !isIntrinsicElement(value);

export type Child = IntrinsicElement;
export const isChild = (value: any): value is Child =>
  typeof value === 'string' ||
  value instanceof String ||
  isIntrinsicElement(value);

export type Children = ReadonlyArray<Child>;

export type ChildNode = Child | Children;
