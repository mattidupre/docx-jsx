import { kebabCase, isObject } from 'lodash-es';
import type { KebabCase } from 'type-fest';

type VarValue = string | boolean;

export type CssVars = Record<`--${string}`, string>;

const createKebabPrefix = <T extends string>(prefix?: T) =>
  (prefix ? `${kebabCase(prefix)}-` : '') as T extends undefined
    ? ''
    : `${KebabCase<T>}-`;

export const optionsToCssVars = <
  TOptions extends Record<
    string,
    undefined | VarValue | Record<string, undefined | VarValue>
  >,
  TPrefix extends string,
>(
  options?: TOptions,
  prefix?: TPrefix,
): CssVars => {
  if (!options) {
    return {};
  }
  const kebabPrefix = createKebabPrefix(prefix);
  return Object.entries(options).reduce((obj, [key, value]) => {
    const keyPrefix = kebabPrefix + kebabCase(key);
    if (!value) {
      return obj;
    }
    if (isObject(value)) {
      Object.assign(obj, optionsToCssVars(value, keyPrefix));
    } else if (value) {
      Object.assign(obj, {
        [`--${keyPrefix}`]: value,
      });
    }
    return obj;
  }, {});
};

export const cssVarsToString = (cssVars: CssVars) =>
  Object.entries(cssVars)
    .map(([key, value]) => `${key}: ${String(value)};`)
    .join(' ');
