import type { IfNever, IfUnknown } from 'type-fest';

// /**
//  * If value is ArrayLike<never>, convert to never.
//  * If value is object, remove all properties of value never. */ type
//  ExpandNever<TSource> = TSource extends ArrayLike<infer T> ? IfNever<T,
// never, TSource> : TSource extends {} ? { [K in keyof TSource as
//   IfNever<TSource[K], never, K>]: TSource[K]; } : TSource;

export type ReplaceUnknownDeep<TSource, TReplacement> = IfUnknown<
  TReplacement,
  // replacing unknown with unknown, so return original
  TSource,
  // otherwise
  IfUnknown<
    TSource,
    // return replacement
    TReplacement,
    // continue iteration
    TSource extends ReadonlyArray<infer T> // array
      ? IfNever<
          ReplaceUnknownDeep<T, TReplacement>,
          // replace Array<never> with never
          never,
          {
            [K in keyof TSource]: ReplaceUnknownDeep<T, TReplacement>;
          }
        >
      : TSource extends object // object
      ? {
          [K in keyof TSource as IfNever<
            ReplaceUnknownDeep<TSource[K], TReplacement>,
            // omit never values
            never,
            K
          >]: ReplaceUnknownDeep<TSource[K], TReplacement>;
        }
      : TSource
  >
>;

// From https://stackoverflow.com/questions/61852773/unordered-tuple-type

type PushFront<TailT extends any[], HeadT> = ((
  head: HeadT,
  ...tail: TailT
) => void) extends (...arr: infer ArrT) => void
  ? ArrT
  : never;

type CalculatePermutations<T extends string, ResultT extends any[] = []> = {
  [K in T]: [Exclude<T, K>] extends [never]
    ? PushFront<ResultT, K>
    : CalculatePermutations<Exclude<T, K>, PushFront<ResultT, K>>;
}[T];

export type ArrayOfAll<U extends string> = Readonly<CalculatePermutations<U>>;
