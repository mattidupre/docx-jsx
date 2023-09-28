import {
  type IntrinsicType,
  type IntrinsicElement,
  type Primitive,
  isIntrinsicElement,
} from '../entities';

// Primitive constructors indicate their respective type.
export type ChildType =
  | IntrinsicType
  | Primitive
  | NumberConstructor
  | StringConstructor;

export type ChildOfType<TType extends ChildType> = TType extends unknown
  ? TType extends IntrinsicType
    ? IntrinsicElement<TType>
    : TType extends null
    ? null
    : TType extends undefined
    ? undefined
    : TType extends true
    ? true
    : TType extends false
    ? false
    : TType extends NumberConstructor
    ? number
    : TType extends StringConstructor
    ? string
    : never
  : never;

export const isChildOfType = <TType extends ChildType>(
  value: any,
  type: TType | ReadonlyArray<TType>,
): value is ChildOfType<TType> =>
  (Array.isArray(type) ? type : [type]).some((thisType) => {
    if (thisType === String) {
      return typeof value === 'string' || value instanceof String;
    }

    if (thisType === Number) {
      return typeof value === 'number' || value instanceof Number;
    }

    if (typeof thisType === 'string') {
      return isIntrinsicElement(value, thisType);
    }

    throw new Error('Invalid search type.');
  });
