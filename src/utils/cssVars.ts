import { kebabCase, isObject } from 'lodash';
import { assignDefined } from './object';
import { joinArrayStrings } from './array';

type VarValue = number | string | boolean;

type VarKey = Lowercase<`--${string}`>;

type VarProperty = `var(--${string})`;

export type CssVars = Record<Lowercase<`--${string}`>, Lowercase<string>>;

const cssVarKeyBase = (...values: ReadonlyArray<undefined | string>) =>
  values
    .flatMap((value) => (value ? kebabCase(value) : []))
    .join('-') as Lowercase<string>;

export const cssVarKey = (...values: ReadonlyArray<undefined | string>) =>
  ('--' + cssVarKeyBase(...values)) as VarKey;

export const cssProperty = (
  ...[value, ...values]: ReadonlyArray<undefined | VarValue>
): undefined | string => {
  const parsedValue = value === undefined ? undefined : String(value);

  if (!values.length) {
    return parsedValue;
  }

  if (parsedValue === undefined) {
    return cssProperty(...values);
  }

  if (!parsedValue.startsWith('--')) {
    throw new TypeError('Non-variables cannot precede defaults');
  }

  const childValue = cssProperty(...values);

  return `var(${joinArrayStrings([parsedValue, childValue], ', ')})`;
};

export const cssVarProperty = (
  key: VarKey | ReadonlyArray<VarKey>,
  defaultValue?: VarValue,
): VarProperty => {
  if (!key.length) {
    throw new TypeError('At least one key required');
  }
  const [currentKey, ...remainingKeys] = [key].flat();
  const nextValue = remainingKeys.length
    ? cssVarProperty(remainingKeys, defaultValue)
    : defaultValue;
  return `var(${currentKey}${nextValue ? `, ${nextValue}` : ''})`;
};

/**
 * Create CSS variable declarations from an object.
 * @example
 * objectToCssVars({ foo: 'bar' }); // {'--foo': 'bar'}
 * objectToCssVars({ foo: { bar: 'baz' } }); // {'--foo-bar': 'baz'}
 * objectToCssVars({ foo: 'bar' }, 'pre-'); // {'--pre-foo': 'bar'}
 */
export const objectToCssVars = <
  TObject extends Record<
    string,
    undefined | VarValue | Record<string, undefined | VarValue>
  >,
>(
  object?: TObject,
  {
    prefix,
  }: {
    prefix?: string;
  } = {},
): CssVars => {
  if (!object) {
    return {};
  }
  return Object.entries(object).reduce((obj, [key, value]) => {
    const keyBase = cssVarKeyBase(prefix, key);
    if (!value) {
      return obj;
    }
    if (isObject(value)) {
      assignDefined(obj, objectToCssVars(value, { prefix: keyBase }));
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
