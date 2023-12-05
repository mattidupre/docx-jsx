import { kebabCase } from 'lodash-es';
import type { KebabCase } from 'type-fest';

export const optionsToCssVars = <
  TOptions extends Record<string, undefined | string>,
>(
  options: TOptions,
) =>
  Object.entries(options).reduce(
    (obj, [key, value]) => {
      if (value) {
        Object.assign(obj, {
          [`--${kebabCase(key)}`]: value,
        });
      }
      return obj;
    },
    {} as {
      [T in keyof TOptions as KebabCase<T> extends string
        ? `--${KebabCase<T>}`
        : never]: TOptions[T];
    },
  );

export const optionsToCssVarsString = (
  ...args: Parameters<typeof optionsToCssVars>
): string =>
  Object.entries(optionsToCssVars(...args))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
