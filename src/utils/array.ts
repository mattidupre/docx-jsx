export type Flat<T> = T extends ReadonlyArray<infer I> ? I : T;

export type UnFlat<T> = Flat<T> | ReadonlyArray<Flat<T>>;

export type AsArray<T> = ReadonlyArray<Flat<T>>;

export const asArray = <T>(value: unknown) =>
  (Array.isArray(value) ? value : [value]) as AsArray<T>;

// export type AsMutableArray<T> = Array<Flat<T>>;

// export const asMutableArray = <T>(value: unknown) =>
//   (Array.isArray(value) ? value : [value]) as AsMutableArray<T>;

export type ParseArrayCallback<TArray, TReturn = unknown> = (
  value: Flat<TArray>,
  index: number,
  subject: TArray,
) => TReturn;

export const parseArray = <TSubject, TReturn>(
  subject: TSubject,
  callback: ParseArrayCallback<TSubject, TReturn>,
) =>
  asArray(subject).reduce((arr, value, index) => {
    const result = callback(value as any, index, arr as any);
    if (result !== undefined) {
      (arr as any).push(result);
    }
    return arr;
  }, []) as ReadonlyArray<Exclude<TReturn, undefined>>;
