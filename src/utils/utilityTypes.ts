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
