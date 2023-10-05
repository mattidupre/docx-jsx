import { type Props } from 'src/utils';
import {
  type ReactElement,
  type ReactNode,
  type FunctionComponentElement,
  type ExoticComponent,
  createElement,
  isValidElement,
} from 'react';
import { asArray } from 'src/utils';

// Nullish: values omitted in the output.
// Stringish: values that are coerced into strings in the output.
// AnyElement / ReactElement: object representing a Component or Intrinsic.
// IntrinsicElement: an element that maps to an output value, e.g., div or textrun.
// OtherElement: a React Fragment or Exotic Component, just noop and return children.

export { ReactElement as AnyElement };

export type Nullish = true | false | null | undefined;
export const isNullish = (value: any): value is Nullish =>
  value === null || value === undefined || value === true || value === false;

export type Stringish = string | number;
export const isStringish = (value: any): value is Stringish =>
  typeof value === 'string' || typeof value === 'number';

export type IntrinsicType = string;
export type IntrinsicProps = Record<string, any>;

export type IntrinsicElement<
  TType extends IntrinsicType = IntrinsicType,
  TProps extends IntrinsicProps = IntrinsicProps,
> = ReactElement<TProps, TType>;

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
): value is FunctionComponentElement<Props> =>
  isValidElement(value) && typeof value.type === 'function';

export type OtherElement = ReactElement<
  { children?: ReactNode },
  ExoticComponent
>;
export const isOtherElement = (value: any): value is OtherElement =>
  isValidElement(value) &&
  !isComponentElement(value) &&
  !isIntrinsicElement(value);
