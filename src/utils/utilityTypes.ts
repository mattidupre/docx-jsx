// type Guard<T> = (value: any, ...args: any) => value is T;

// type GuardType<T extends Guard<any>> = T extends Guard<infer G> ? G : never;

// declare const SValue: unique symbol;
// declare const SUndefined: unique symbol;

// type EncodeUndefined<TValue> = TValue extends undefined
//   ? typeof SUndefined
//   : TValue;

// type DecodeUndefined<TValue> = TValue extends typeof SUndefined
//   ? Exclude<TValue, typeof SUndefined> | undefined
//   : TValue;

// type EncodeValue<TValue> = {
//   [SValue]?: EncodeUndefined<TValue>;
// };

// type DecodeValue<
//   TObj extends {},
//   TDefault = never,
// > = typeof SValue extends keyof TObj
//   ? DecodeUndefined<TObj[typeof SValue]>
//   : TDefault;

// type OmitEncodedValue<TObj extends {}> = Omit<TObj, typeof SValue>;

// declare const BRAND_SYMBOL: unique symbol;

// type BrandKey = number | symbol | string;

// export type Brand<TBaseType, TBrandKey extends BrandKey> = TBaseType & {
//   [BRAND_SYMBOL]?: TBrandKey;
// };

// export type Unbrand<TValue> = Omit<TValue, typeof BRAND_SYMBOL>;

// export type GetBrandKey<TBaseType> = typeof BRAND_SYMBOL extends keyof TBaseType
//   ? TBaseType[typeof BRAND_SYMBOL]
//   : never;

// export type IsBranded<TBaseType> = typeof BRAND_SYMBOL extends keyof TBaseType
//   ? true
//   : false;

// export type IsBrandedWith<TBaseType, TBrandKey extends BrandKey> = [
//   GetBrandKey<TBaseType>,
// ] extends [TBrandKey]
//   ? true
//   : false;

// export type MapBrandWith<
//   TValue,
//   TDictionary extends Record<BrandKey, any> = any,
// > = IsBranded<TValue> extends true
//   ? GetBrandKey<TValue> extends keyof TDictionary
//     ? TDictionary[GetBrandKey<TValue>]
//     : MapBrandWith<Unbrand<TValue>, TDictionary>
//   : TValue extends object
//   ? { [K in keyof TValue]: MapBrandWith<TValue[K], TDictionary> }
//   : TValue;

// type Temp = Brand<'foo', 'bar'>;

// type Nested = {
//   foo: {
//     bar: {
//       baz: ReadonlyArray<Temp>;
//     };
//   };
// };

// type Temp2 = MapBrandWith<Nested, { bar: 'repalcement' }>;
