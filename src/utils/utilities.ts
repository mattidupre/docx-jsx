export type UnionToIntersection<TUnion> = (
  TUnion extends any ? (k: TUnion) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type KeyOfValue<TObject, TValue extends TObject[keyof TObject]> = {
  [K in keyof TObject]: TObject[K] extends TValue ? K : never;
}[keyof TObject];

export type Flat<T> = T extends ReadonlyArray<infer I> ? I : T;

export type UnFlat<T> = Flat<T> | ReadonlyArray<Flat<T>>;

export type AsArray<T> = ReadonlyArray<Flat<T>>;

export const asArray = <T>(value: unknown) =>
  (Array.isArray(value) ? value : [value]) as AsArray<T>;

// export type AsMutableArray<T> = Array<Flat<T>>;

// export const asMutableArray = <T>(value: unknown) =>
//   (Array.isArray(value) ? value : [value]) as AsMutableArray<T>;

export type ParseOverArray<TArray, TReturn = unknown> = (
  value: Flat<TArray>,
  index: number,
  subject: TArray,
) => TReturn;

export const parseOverArray = <TSubject, TReturn>(
  subject: TSubject,
  callback: ParseOverArray<TSubject, TReturn>,
) =>
  asArray(subject).reduce((arr, value, index) => {
    const result = callback(value as any, index, arr as any);
    if (result !== undefined) {
      (arr as any).push(result);
    }
    return arr;
  }, []) as ReadonlyArray<Exclude<TReturn, undefined>>;

type GenericObject = Record<string | number | symbol, unknown>;

export const isObject = (value: any): value is GenericObject =>
  typeof value === 'object' && !Array.isArray(value) && value !== null;

export const omitFromObject = <
  TKey extends keyof GenericObject,
  TObj extends GenericObject,
>(
  obj: TObj,
  key: TKey,
): Omit<TObj, TKey> => {
  const { [key]: omitted, ...rest } = obj;
  return rest;
};

export type GetRequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];

type ObjectCallbackParameters<TObj extends GenericObject> = {
  [K in keyof TObj]: [K, TObj[K], TObj];
}[keyof TObj];

export const mapObjectValues = <TObj extends GenericObject>(
  obj: TObj,
  callback: (...args: ObjectCallbackParameters<TObj>) => unknown,
) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      callback(key, value as any, obj),
    ]),
  ) as GenericObject;

export const mapObjectKeys = <TObj extends GenericObject>(
  obj: TObj,
  callback: (...args: ObjectCallbackParameters<TObj>) => keyof GenericObject,
) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      callback(key, value as any, obj),
      value,
    ]),
  ) as GenericObject;

export const mapObjectEntries = <TObj extends GenericObject>(
  obj: TObj,
  callback: (
    ...args: ObjectCallbackParameters<TObj>
  ) => undefined | [keyof GenericObject, unknown],
) =>
  Object.entries(obj).reduce((thisObj, [key, value]) => {
    const entry = callback(key, value as any, obj);
    if (entry) {
      // eslint-disable-next-line prefer-destructuring, no-param-reassign
      thisObj[entry[0]] = entry[1];
    }
    return thisObj;
  }, {} as GenericObject);
