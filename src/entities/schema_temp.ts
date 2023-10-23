import { type ReactNode } from 'react';
import { type Simplify } from 'type-fest';

const ENTRY_KEY = Symbol('Schema entry key');

type EntryType = keyof typeof T;

type EntryOptions = {
  undefinable: boolean;
};

type EntryMeta = Readonly<
  EntryOptions & {
    type: EntryType;
    data: unknown;
  }
>;

type Entry<TMeta extends EntryMeta = EntryMeta> = {
  [ENTRY_KEY]: TMeta;
};

type GetEntryMeta<T extends Entry> = T[typeof ENTRY_KEY];

const createEntry = <TMeta extends EntryMeta>(meta: TMeta): Entry<TMeta> => ({
  [ENTRY_KEY]: meta,
});

const entries = {
  String: {
    define: (options: EntryOptions = { undefinable: false }) =>
      createEntry({ ...options, type: 'String', data: {} } as const),
    check: (value: any): value is string => typeof value === 'string',
  },

  Number: {
    define: (options: EntryOptions = { undefinable: false }) =>
      createEntry({ ...options, type: 'Number', data: {} } as const),
    check: (value: any): value is number => typeof value === 'number',
  },

  Object: {
    define: <TObj extends Record<string, Entry>>(
      object: TObj,
      options: EntryOptions = { undefinable: false },
    ) => createEntry({ ...options, type: 'Object', data: { object } } as const),
    check: (value: any): value is Record<string, unknown> =>
      typeof value !== 'object' ||
      typeof value === null ||
      Array.isArray(value),
    map: <T extends Record<string, any>>(
      value: T,
      callback: (value: T[keyof T], key: T) => any,
    ) =>
      Object.fromEntries(
        Object.entries(value).map(([key, value]) => [
          key,
          callback(value, key as any),
        ]),
      ),
  },

  Array: {
    define: <TArr extends ReadonlyArray<Entry>>(
      array: TArr,
      options: EntryOptions = { undefinable: false },
    ) => createEntry({ ...options, type: 'Object', data: { array } } as const),
    check: (value: any): value is Record<string, unknown> =>
      typeof value !== 'object' ||
      typeof value === null ||
      Array.isArray(value),
    map: <T extends ReadonlyArray<any>>(
      { array }: { array: T },
      callback: (value: T[number], key: T) => any,
    ) =>
      array.map((value: any, index: number) => callback(value, index as any)),
  },

  Union: {
    define: <TArr extends ReadonlyArray<Entry>>(
      array: TArr,
      options: EntryOptions = { undefinable: false },
    ) => createEntry({ ...options, type: 'Object', data: { array } } as const),
    check: (value: any): value is Record<string, unknown> =>
      typeof value !== 'object' ||
      typeof value === null ||
      Array.isArray(value),
  },

  Child: {
    define: <TType>(
      types: ReadonlyArray<TType>,
      options: EntryOptions = { undefinable: false },
    ) => createEntry({ ...options, type: 'Child', data: { types } }),
  },

  Children: {
    define: <TType>(
      types: ReadonlyArray<TType>,
      options: EntryOptions = { undefinable: false },
    ) => createEntry({ ...options, type: 'Children', data: { types } }),
  },
} as const satisfies Record<
  string,
  {
    define: (...args: any) => Entry;
    check?: (value: any) => value is any;
    map?: (
      data: any,
      callback: (thisValue: any, key: string | number) => any,
    ) => any;
  }
>;

export const SCHEMA = {
  document: {
    temp: T.String(),
    children: T.Children(['pagesGroup']),
  },
  pagesGroup: {
    headers: {
      default: T.Child(['header']),
      even: T.Child(['header']),
      odd: T.Child(['header']),
      first: T.Child(['header']),
    },
    children: T.Children(['paragraph', 'table']),
    footers: {
      default: T.Child(['footer']),
      even: T.Child(['footer']),
      odd: T.Child(['footer']),
      first: T.Child(['footer']),
    },
  },
  header: {
    children: T.Children(['paragraph', 'table']),
  },
  footer: {
    children: T.Children(['paragraph', 'table']),
  },
  paragraph: {
    children: T.Children(['textrun']),
  },
  textrun: {
    children: T.Children(['textrun']),
  },
  table: {},
} as const satisfies Record<string, any>;

type InferSchema<T extends Record<string, unknown>, TChild, TChildren> = {
  [K in keyof T]: typeof ENTRY_TYPE extends keyof T[K]
    ? T[K][typeof ENTRY_TYPE] extends 'child'
      ? undefined | TChild
      : T[K][typeof ENTRY_TYPE] extends 'children'
      ? TChildren
      : T[K][typeof ENTRY_TYPE] extends 'string'
      ? string
      : T[K][typeof ENTRY_TYPE] extends 'number'
      ? number
      : never
    : T[K] extends Record<string, any>
    ? Simplify<InferSchema<T[K], TChild, TChildren>>
    : never;
};

const parse = (values, handleChild) => {};

type Temp = InferSchema<typeof SCHEMA, 'child', 'children'>;

type Options = {
  document: Record<string, never>;
  pagesGroup: Record<string, never>;
  header: Record<string, never>;
  footer: Record<string, never>;
  paragraph: Record<string, never>;
  textrun: Record<string, never>;
  table: Record<string, never>;
};

export type ElementType = keyof typeof SCHEMA;

type ApplySchemaRecursive<TValue extends Record<string, any>, TChild> = {
  [T in keyof TValue]: TValue[T] extends ElementType
    ? undefined | TChild
    : TValue[T] extends ReadonlyArray<infer I extends ElementType>
    ? NonNullable<ApplySchemaRecursive<(typeof SCHEMA)[I], TChild>>
    : TValue[T] extends Record<string, any>
    ? ApplySchemaRecursive<TValue[T], TChild>
    : never;
};

type ApplySchema<TChild> = {
  [TElementType in ElementType]: Options[ElementType] &
    ApplySchemaRecursive<typeof SCHEMA, TChild>;
};

export type DocumentHtml = ApplySchema<string>;

export type ElementProps = ApplySchema<ReactNode>;

export type ParserOptions = ApplySchema<any>;
