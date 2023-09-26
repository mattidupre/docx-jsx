/* eslint-disable no-param-reassign */
import {
  type KeyOfValue,
  isObject,
  type GenericObject,
} from 'src/utils/utilities';
import * as DOCX_EXTERNAL_CLASSES from './lib/DocXClasses';
import { type ReactElement, Fragment } from 'react';

const DOCX_CLASSES_BY_NAME = DOCX_EXTERNAL_CLASSES satisfies Record<
  string,
  ClassAny
>;

const DOCX_NAMES_BY_NAME_ANY = Object.fromEntries(
  Object.keys(DOCX_CLASSES_BY_NAME).reduce((arr, name) => {
    arr.push([name, name], [name.toLowerCase(), name]);
    return arr;
  }, [] as any),
) as DocXClassNamesByNameAny;

const DOCX_ENTRIES_MAP = Object.entries(DOCX_CLASSES_BY_NAME).reduce(
  (map, [className, Class]) => {
    const entry = {
      DOCX_NAME: className,
      DOCX_NAME_LC: className.toLowerCase(),
      DOCX_CLASS: Class,
    } as const satisfies Record<keyof AsDocXEntry, any>;
    map.set(className, entry);
    map.set(className.toLowerCase(), entry);
    map.set(Class, entry);
    return map;
  },
  new Map(),
) as Map<DocXClassNameAny | DocXClass, AsDocXEntry>;

type ClassAny = { new (...args: any): any };
export type DocXClassName = keyof typeof DOCX_CLASSES_BY_NAME;
export type DocXClassNameLC = Lowercase<DocXClassName>;
export type DocXClassNameAny = DocXClassName | DocXClassNameLC;
type DocXClassNamesByNameAny = {
  [N in DocXClassName as N | Lowercase<N>]: N;
};
export type DocXClass = DocXClassesByName[DocXClassName];
export type DocXInstance = InstanceType<DocXClass>;
export type DocXAny = DocXClassNameAny | DocXClass | DocXInstance;
type DocXClassesByName = typeof DOCX_CLASSES_BY_NAME;
type DocXInstancesByName = {
  [N in DocXClassName]: DocXClassesByName[N] extends ClassAny
    ? InstanceType<DocXClassesByName[N]>
    : never;
};

type AsDocXEntry<TName extends DocXClassName = DocXClassName> = {
  DOCX_NAME: TName;
  DOCX_NAME_LC: Lowercase<TName>;
  DOCX_CLASS: DocXClassesByName[TName];
};

const asDocXEntry = <TKey extends DocXAny>(
  value: TKey,
): AsDocXEntry<AsDocXClassName<TKey>> => {
  const needle = (
    (value as any) in DOCX_NAMES_BY_NAME_ANY ? value : value?.constructor
  ) as any;
  const entry = DOCX_ENTRIES_MAP.get(needle);
  if (entry === undefined) {
    throw new Error(
      `Value is not a valid DocX class name, class, or instance: "${value}".`,
    );
  }
  return entry as any;
};

export type AsDocXClassName<TKey extends DocXAny> =
  TKey extends DocXClassNameAny
    ? DocXClassNamesByNameAny[TKey]
    : TKey extends DocXClass
    ? KeyOfValue<DocXClassesByName, TKey>
    : TKey extends InstanceType<infer TClass extends DocXClass>
    ? KeyOfValue<DocXClassesByName, TClass>
    : never;

export const asDocXClassName = <TKey extends DocXAny>(
  value: TKey,
): AsDocXClassName<TKey> => asDocXEntry(value).DOCX_NAME;

export type AsDocXClass<TKey extends DocXAny> =
  DocXClassesByName[AsDocXClassName<TKey>];

export const asDocXClass = <TKey extends DocXAny>(
  value: TKey,
): AsDocXClass<TKey> => asDocXEntry(value).DOCX_CLASS;

export type AsDocXOptions<TKey extends DocXAny> = ConstructorParameters<
  AsDocXClass<TKey>
>[0] &
  GenericObject;

export type AsDocXInstance<TKey extends DocXAny> =
  DocXInstancesByName[AsDocXClassName<TKey>];

export const asDocXInstance = <
  TKey extends DocXAny,
  TOptions extends AsDocXOptions<TKey>,
>(
  key: TKey,
  options: TOptions,
): AsDocXInstance<TKey> => {
  const Class = asDocXClass(key);
  return new Class(options as any) as any;
};

export type AsDocXElement<TKey extends DocXAny> = ReactElement<
  any,
  AsDocXClassName<TKey>
>;

export const isDocXClassName = <TKey extends undefined | DocXAny>(
  value: any,
  key?: TKey,
): value is TKey extends DocXAny ? AsDocXClassName<TKey> : DocXClassName =>
  value in DOCX_CLASSES_BY_NAME &&
  (key === undefined || value === asDocXClassName(key));

export const isDocXClassNameLC = <TKey extends undefined | DocXAny>(
  value: any,
  key?: TKey,
): value is TKey extends DocXAny ? AsDocXClassName<TKey> : DocXClassName =>
  value in DOCX_CLASSES_BY_NAME &&
  (key === undefined || value === asDocXClassName(key).toLowerCase());

export const isDocXClassNameAny = (value: any): value is DocXClassNameAny =>
  value in DOCX_NAMES_BY_NAME_ANY;

export const isDocXClass = <TKey extends undefined | DocXAny>(
  value: any,
  key?: TKey,
): value is TKey extends DocXAny ? AsDocXClass<TKey> : DocXClassName => {
  const Class = DOCX_ENTRIES_MAP.get(value)?.DOCX_CLASS;
  if (value !== Class) {
    return false;
  }
  if (key === undefined) {
    return true;
  }
  return value === asDocXClass(key);
};

export const isDocXInstance = <TKey extends undefined | DocXAny>(
  value: any,
  key?: TKey,
): value is TKey extends DocXAny ? AsDocXInstance<TKey> : DocXInstance =>
  isDocXClass(value?.constructor, key);

export const isReactElement = (value: any): value is ReactElement =>
  isObject(value) && 'type' in value && 'props' in value;

export type DocXElement = ReactElement<any, DocXClassNameLC>;

export const isDocXElement = <TKey extends undefined | DocXAny>(
  value: any,
  key?: TKey,
): value is TKey extends DocXAny ? AsDocXElement<TKey> : DocXElement => {
  if (!(isObject(value) && 'props' in value)) {
    return false;
  }
  if (key === undefined) {
    return isDocXClassNameLC(value.type);
  }
  return value.type === key;
};

export type FunctionElement = ReactElement<
  any,
  (...args: ReadonlyArray<unknown>) => null | ReactElement
>;

export const isFunctionElement = (value: any): value is FunctionElement =>
  isObject(value) && 'props' in value && typeof value.type === 'function';

export const isFragmentElement = (
  value: any,
): value is ReactElement<any, typeof Fragment> => {
  return value?.type === Fragment;
};

export type IntrinsicElement = ReactElement<any, string>;

export const isIntrinsicElement = (value: any): value is IntrinsicElement =>
  isObject(value) && 'props' in value && typeof value.type === 'string';

export type Ignored = null | undefined | boolean;

export const isIgnored = (value: any): value is Ignored =>
  value === null || value === undefined || value === true || value === false;

export type StringElement = number | string;

export const isStringElement = (value: any): value is StringElement =>
  typeof value === 'string' || typeof value === 'number';
