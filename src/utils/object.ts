import type { IfAny, PartialDeep, Primitive } from 'type-fest';
import { merge, omitBy } from 'lodash';

export type KeyedObject = Record<PropertyKey, unknown> & { length?: never };

export type MergedObjectKeys<T> = T extends KeyedObject ? keyof T : never;

export type MergedObjectValues<T extends KeyedObject> = {
  [K in MergedObjectKeys<T>]: T extends unknown
    ? K extends keyof T
      ? T[K]
      : never
    : never;
};

export const isKeyedObject = (value: any): value is KeyedObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const objectValuesDefined = <T extends KeyedObject>(value: T) =>
  omitBy(value, (v) => v === undefined) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };

export const assignDefined = <T extends KeyedObject>(
  value0: T,
  ...values: ReadonlyArray<undefined | Partial<T>>
): T =>
  values.reduce((target: NonNullable<T>, value) => {
    if (value !== undefined) {
      Object.keys(value).forEach((key: keyof T) => {
        if (value[key] !== undefined) {
          target[key] = value[key] as T[keyof T];
        } else if (!(key in target)) {
          target[key] = undefined as T[keyof T];
        }
      });
    }
    return target;
  }, value0);

export const extendDefined = <T extends KeyedObject>(
  value0: T,
  ...values: ReadonlyArray<undefined | Partial<T>>
): T => assignDefined({} as T, value0, ...values);

export const mergeWithDefault = <T>(
  defaultValue: T,
  ...[targetValue, ...values]: ReadonlyArray<undefined | PartialDeep<T>>
) => {
  // targetValue will otherwise be mutated before it can be extended onto
  // itself.
  const targetValueCloned = structuredClone(targetValue ?? {});
  return merge(targetValue ?? {}, defaultValue, targetValueCloned, ...values);
};

// export const mapAssign = <TOut extends KeyedObject, TIn = unknown>(
//   values: ReadonlyArray<TIn>,
//   callback: (value: TIn) => TOut,
// ): TOut => {
//   const target = (isKeyedObject(values[0]) ? values[0] : {}) as TOut;
//   return assignDefined(
//     target,
//     ...values.map((value) =>
//       isKeyedObject(value) ? callback(value) : undefined,
//     ),
//   );
// };

/**
 * Gets Fixes TypeScripts stubborn index errors.
 */
export const isKeyOf = <TValue extends KeyedObject>(
  key: any,
  value: TValue,
): key is keyof TValue => key in value;

/**
 * Fixes TypeScripts stubborn index errors.
 */
export const getValueOf = <
  TValue extends KeyedObject,
  TKey extends undefined | PropertyKey,
>(
  value: TValue,
  key: TKey,
) =>
  value[key as keyof TValue] as IfAny<
    TKey,
    undefined | TValue[keyof TValue],
    TKey extends keyof TValue ? TValue[TKey] : undefined | TValue[keyof TValue]
  >;

/**
 * Returns an object with no nested plain object children.
 * Other children (e.g., arrays, functions) are left as-is.
 */
export const joinNestedKeys = (
  object: KeyedObject,
  separator: string,
): KeyedObject => {
  const newObject: KeyedObject = {};
  for (const key in object) {
    const value = object[key];
    if (typeof value === 'function' || !isKeyedObject(value)) {
      newObject[key] = value;
    } else {
      const childObject = joinNestedKeys(value, separator);
      for (const subKey in childObject) {
        const parsedKey = `${key}${separator}${subKey}`;
        if (parsedKey in object) {
          throw new Error(`Key ${parsedKey} already exists in object`);
        }
        newObject[parsedKey] = childObject[subKey];
      }
    }
  }
  return newObject;
};

/**
 * If value is a keyed object return value[key], otherwise return value.
 */
export const getSubOrSelf = <
  TKey extends string,
  TValue extends Primitive | Partial<Record<TKey, unknown>>,
>(
  key: TKey,
  value: TValue,
) =>
  (isKeyedObject(value) ? value[key] : value) as TValue extends KeyedObject
    ? TValue[TKey]
    : TValue;
