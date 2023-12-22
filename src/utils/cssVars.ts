import { kebabCase, isObject } from 'lodash';
import { assignDefined } from './object';

type VarValue = number | string | boolean;

type VarKey = Lowercase<`--${string}`>;

export type CssVars = Record<Lowercase<`--${string}`>, Lowercase<string>>;

const cssVarKeyBase = (...values: ReadonlyArray<undefined | string>) =>
  values
    .flatMap((value) => (value ? kebabCase(value) : []))
    .join('-') as Lowercase<string>;

export const cssVarKey = (...values: ReadonlyArray<undefined | string>) =>
  ('--' + cssVarKeyBase(...values)) as VarKey;

// TODO: facilitate var(--foo, var(--bar, var(--baz)))
export const cssVarProperty = (key: VarKey, defaultValue?: VarValue) =>
  (defaultValue
    ? `var(${key}, ${defaultValue})`
    : `var(${key})`) as `var(--${string})`;

export const objectToCssVars = <
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
  return Object.entries(options).reduce((obj, [key, value]) => {
    const keyBase = cssVarKeyBase(prefix, key);
    if (!value) {
      return obj;
    }
    if (isObject(value)) {
      assignDefined(obj, objectToCssVars(value, keyBase));
    } else if (value) {
      assignDefined(obj, {
        [cssVarKey(keyBase)]: String(value),
      });
    }
    return obj;
  }, {});
};

export const cssVarsToString = (cssVars: CssVars) =>
  Object.entries(cssVars)
    .map(([key, value]) => `${key}: ${String(value)};`)
    .join(' ');
