import { toLower, kebabCase } from 'lodash';
import { joinArrayStrings } from './array';

export const toLowercase = <T extends string>(string: T) =>
  toLower(string) as Lowercase<T>;

/**
 * Converts everything to Kebab Case and joins.
 */
export const joinKebab = (...args: ReadonlyArray<undefined | string>) =>
  joinArrayStrings(
    args.map((value) => value && kebabCase(value)),
    '-',
  );

/**
 * Converts everything except prefix to Kebab Case and joins.
 */
export const prefixKebab = (
  prefixArg?: string,
  ...args: ReadonlyArray<undefined | string>
) =>
  joinArrayStrings(
    [prefixArg, ...args.map((value) => value && kebabCase(value))],
    '-',
  );
