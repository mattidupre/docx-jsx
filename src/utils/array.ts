import type { ArrayValues, Simplify, UnionToIntersection } from 'type-fest';
import {
  type MergedObjectKeys,
  type KeyedObject,
  type MergedObjectValues,
  assignDefined,
} from './object';

export type ToDefinedArray<T> = Simplify<
  T extends undefined
    ? Array<unknown>
    : T extends ReadonlyArray<infer I>
    ? Array<Exclude<I, undefined>>
    : Array<Exclude<T, undefined>>
>;

export const toDefinedArray = <T>(value: T): ToDefinedArray<T> => {
  if (value === undefined) {
    return [] as unknown as ToDefinedArray<T>;
  }
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined) as ToDefinedArray<T>;
  }
  return [value] as ToDefinedArray<T>;
};

/**
 * Like Array.join, but completely flattens and filters lengthy strings first.
 */
export const joinArrayStrings = (array: any, separator: string) =>
  [array]
    .flat(Infinity)
    .filter((value) => typeof value === 'string' && value.length)
    .join(separator);

export type ArrayObjectValues<T extends ReadonlyArray<any>> =
  T extends ReadonlyArray<infer I>
    ? I extends KeyedObject
      ? I
      : never
    : never;

export type ArrayObjectKeys<TArray extends ReadonlyArray<any>> =
  MergedObjectKeys<ArrayObjectValues<TArray>>;

export type ArrayObjectMerged<T extends ReadonlyArray<any>> =
  MergedObjectValues<ArrayObjectValues<T>>;

export type PickFromArray<
  TArray extends ReadonlyArray<any>,
  TKeys extends ArrayObjectKeys<TArray>,
> = Simplify<
  Array<{
    [K in TKeys]: UnionToIntersection<NonNullable<ArrayValues<TArray>>>[K];
  }>
>;

export const pickFromArray = <
  TArray extends ReadonlyArray<any>,
  TKeys extends ArrayObjectKeys<TArray>,
>(
  arr: TArray,
  keys: TKeys | ReadonlyArray<TKeys>,
): PickFromArray<TArray, TKeys> => {
  type TValue = ArrayObjectMerged<TArray>;
  const keysArray = toDefinedArray(keys);
  return arr.map((value) =>
    keysArray.reduce(
      (target: TValue, key) => {
        if (value === undefined) {
          return target;
        }
        return assignDefined(target, { [key]: value[key] } as TValue);
      },
      Object.fromEntries(keysArray.map((k) => [k, undefined])) as TValue,
    ),
  );
};

export type PluckFromArray<
  TArray extends ReadonlyArray<any>,
  TKey extends ArrayObjectKeys<TArray>,
> = Simplify<Array<ArrayObjectMerged<TArray>[TKey]>>;

export const pluckFromArray = <
  TArray extends ReadonlyArray<any>,
  TKey extends ArrayObjectKeys<TArray>,
>(
  arr: TArray,
  key: TKey,
) => {
  return toDefinedArray(arr.map((value) => value?.[key])) as PluckFromArray<
    TArray,
    TKey
  >;
};

/**
 * Fixes TypeScripts stubborn index errors.
 */
export const isValueInArray = (array: ReadonlyArray<any>, value: any) => {
  return array.includes(value);
};

export const isAllValuesInArray = (
  array: ReadonlyArray<any>,
  ...values: ReadonlyArray<any>
) => values.every((value) => array.includes(value));

export const isAnyValuesInArray = (
  array: ReadonlyArray<any>,
  ...values: ReadonlyArray<any>
) => values.some((value) => array.includes(value));
