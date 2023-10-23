import { type ReactNode } from 'react';

export const SCHEMA = {
  document: {
    children: ['pagesGroup'],
  },
  pagesGroup: {
    headers: {
      default: 'header',
      even: 'header',
      odd: 'header',
      first: 'header',
    },
    children: ['paragraph', 'table'],
    footers: {
      default: 'header',
      even: 'header',
      odd: 'header',
      first: 'header',
    },
  },
  header: { children: ['paragraph', 'table'] },
  footer: { children: ['paragraph', 'table'] },
  paragraph: { children: ['textrun'] },
  textrun: { children: ['textrun'] },
  table: {},
} as const satisfies Record<string, any>;

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
