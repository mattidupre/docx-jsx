import { isObject, type Props } from 'src/utils';
import {
  type ReactElement,
  type FunctionComponentElement,
  type ExoticComponent,
} from 'react';
import { type ChildType, type ChildOfType } from './lib/isChildOfType';

export { ReactElement as Element };

export type IntrinsicType = string;

export const isElement = (value: any): value is ReactElement =>
  isObject(value) && 'props' in value && 'type' in value;

export type Nullish = true | false | null | undefined;

export const isNullish = (value: any): value is Nullish =>
  value === null || value === undefined || value === true || value === false;

export type Stringish = string | number;

export const isStringish = (value: any): value is Stringish =>
  typeof value === 'string' || typeof value === 'number';

export type Primitive = Nullish | Stringish;

export const isPrimitive = (value: any): value is Primitive =>
  isNullish(value) || isStringish(value);

export { FunctionComponentElement as FunctionElement };

export const isFunctionElement = (
  value: any,
): value is FunctionComponentElement<Props> =>
  isElement(value) && typeof value.type === 'function';

export type IntrinsicElement<TType extends IntrinsicType = IntrinsicType> =
  ReactElement<Props, Lowercase<TType>>;

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

export type OtherElement = ReactElement<Props, ExoticComponent>;

export const isOtherElement = (value: any): value is OtherElement =>
  isElement(value) && !isFunctionElement(value) && !isIntrinsicElement(value);

export type Child<TType extends ChildType = ChildType> = ChildOfType<TType>;

export const isChild = (value: any): value is Child =>
  isNullish(value) || isStringish(value) || isElement(value);

export type Children<TType extends ChildType = ChildType> = ReadonlyArray<
  Child<TType>
>;

export const isChildren = (value: any): value is Children =>
  Array.isArray(value) && value.every((v) => isChild(v));

export type RenderedNode<TType extends ChildType = ChildType> =
  | Child<TType>
  | Children<TType>;

export const isRenderedNode = (value: any): value is RenderedNode =>
  isChild(value) || isChildren(value);
