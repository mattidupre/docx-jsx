import type { IfAny, PartialDeep } from 'type-fest';
import { isPlainObject, merge } from 'lodash-es';

export type KeyedObject = Record<PropertyKey, unknown> & { length?: never };

export type MergedObjectKeys<T> = T extends KeyedObject ? keyof T : never;

export type MergedObjectValues<T extends KeyedObject> = {
  [K in MergedObjectKeys<T>]: T extends unknown
    ? K extends keyof T
      ? T[K]
      : never
    : never;
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

export const mapAssign = <TOut extends Record<string, unknown>, TIn = unknown>(
  values: ReadonlyArray<TIn>,
  callback: (value: TIn) => TOut,
): TOut => {
  const target = (isPlainObject(values[0]) ? values[0] : {}) as TOut;
  return assignDefined(target, ...values.map((value) => callback(value)));
};

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
  TKey extends PropertyKey,
  TValue extends KeyedObject,
>(
  key: TKey,
  value: TValue,
) =>
  value[key as keyof TValue] as IfAny<
    TKey,
    undefined | TValue[keyof TValue],
    TKey extends keyof TValue ? TValue[TKey] : undefined | TValue[keyof TValue]
  >;
