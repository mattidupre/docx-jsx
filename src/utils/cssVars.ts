import { kebabCase, isObject } from 'lodash-es';
import type { KebabCase } from 'type-fest';

const createKebabPrefix = <T extends string>(prefix?: T) =>
  (prefix ? `${kebabCase(prefix)}-` : '') as T extends undefined
    ? ''
    : `${KebabCase<T>}-`;

export const optionsToCssVars = <
  TOptions extends Record<
    string,
    undefined | string | Record<string, undefined | string>
  >,
  TPrefix extends string,
>(
  options?: TOptions,
  prefix?: TPrefix,
): Record<`--${string}`, string> => {
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

export const optionsToCssVarsString = (
  ...args: Parameters<typeof optionsToCssVars>
): string =>
  Object.entries(optionsToCssVars(...args))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
