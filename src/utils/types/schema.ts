declare const LABEL_KEY: unique symbol;

declare const DEFAULT_LABEL: unique symbol;

type Label = symbol | string;

export type Relation<TLabel extends Label = typeof DEFAULT_LABEL> = {
  [LABEL_KEY]?: TLabel;
};

type GetRelationLabel<T> = typeof LABEL_KEY extends keyof T
  ? NonNullable<T[typeof LABEL_KEY]>
  : never;

export type RelationDictionary<
  TDictionary extends Record<Label, any>,
  TDefault = never,
> = {
  [K in keyof TDictionary]-?: TDictionary[K];
} & {
  [DEFAULT_LABEL]: TDefault;
};

type ReplaceValue<TSource, TReplacement> =
  typeof DEFAULT_LABEL extends keyof TReplacement
    ? GetRelationLabel<TSource> extends keyof TReplacement
      ? TReplacement[GetRelationLabel<TSource>]
      : TReplacement[typeof DEFAULT_LABEL]
    : TReplacement;

export type ReplaceRelationsDeep<TSource, TReplacement> =
  TSource extends unknown
    ? typeof LABEL_KEY extends keyof TSource
      ? ReplaceValue<TSource, TReplacement>
      : TSource extends {}
      ? {
          [K in keyof TSource]: ReplaceRelationsDeep<TSource[K], TReplacement>;
        }
      : TSource
    : never;
