type BaseOptions = {
  undefinable?: boolean;
  min?: number;
  max?: number;
  typeName?: string;
};

// TODO: create asObjectOf, add mapKeys, mapValues option

const parseOptions = (options: BaseOptions): Required<BaseOptions> => ({
  undefinable: false,
  min: 0,
  max: Infinity,
  typeName: 'type',
  ...options,
});

const asArray = <T>(value: undefined | T | ReadonlyArray<T>) =>
  (value === undefined
    ? []
    : Array.isArray(value)
    ? value
    : [value]) as ReadonlyArray<T>;

type AsUndefinable<TValue, TOptions extends BaseOptions> =
  | (TOptions['undefinable'] extends true ? undefined : never)
  | Exclude<TValue, undefined>;

const asUndefinable = <TValue, TOptions extends BaseOptions>(
  value: TValue,
  { undefinable, typeName }: TOptions,
) => {
  if (undefinable !== true && value === undefined) {
    throw new Error(`Expected ${typeName} to not be undefined.`);
  }
  return value as AsUndefinable<TValue, TOptions>;
};

const asOfLength = (
  value: ReadonlyArray<unknown>,
  { min = 0, max = Infinity, typeName }: BaseOptions,
) => {
  if (min >= 0 && value.length < min) {
    throw new Error(
      `Expected ${typeName} to have ${
        min === 0
          ? 'a defined value'
          : min === 1
          ? 'at least one value'
          : `at least ${min} values.`
      }.`,
    );
  }
  if (max >= 0 && value.length > max) {
    throw new Error(
      max === 0
        ? `Expected ${typeName} to be an empty array.`
        : `Expected ${typeName} to have no more than ${max} value${
            max === 1 ? 's' : ''
          }.`,
    );
  }
};

export type AsFlatOf<
  TValue,
  TOptions extends BaseOptions = BaseOptions,
> = TValue extends ReadonlyArray<infer T>
  ? AsUndefinable<T, TOptions>
  : AsUndefinable<TValue, TOptions>;

export const asFlatOf = <
  TValue,
  TOptions extends Omit<BaseOptions, 'min' | 'max'>,
>(
  value: TValue | ReadonlyArray<TValue>,
  options = {} as TOptions,
) => {
  const parsedOptions = parseOptions(options);
  asUndefinable(value, parsedOptions);
  const [flatValue] = asArray(value);
  asUndefinable(flatValue, parsedOptions);
  return flatValue as AsFlatOf<TValue, TOptions>;
};

export type AsArrayOf<
  TValue,
  TOptions extends BaseOptions = BaseOptions,
> = TValue extends ReadonlyArray<infer T>
  ? ReadonlyArray<T>
  : ReadonlyArray<AsUndefinable<TValue, TOptions>>;

export const asArrayOf = <TValue, TOptions extends BaseOptions>(
  value: TValue,
  options = {} as TOptions,
) => {
  const parsedOptions = parseOptions(options);
  asUndefinable(value, parsedOptions);
  const arr = asArray(value);
  asOfLength(arr, parsedOptions);
  return arr as AsArrayOf<TValue, TOptions>;
};
