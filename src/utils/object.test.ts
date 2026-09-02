import { expect, test, describe } from 'vitest';
import {
  assignDefined,
  extendDefined,
  getSubOrSelf,
  getValueOf,
  isKeyOf,
  isKeyedObject,
  joinNestedKeys,
  mergeWithDefault,
  objectValuesDefined,
} from './object';

const MOCK_FUNCTION = Object.freeze(function () {});

describe('joinNestedKeys', () => {
  test('passing deep object', () => {
    expect(
      joinNestedKeys(
        {
          a: 'a_a',
          b: {
            b_a: 'b_a_a',
            b_b: { b_b_a: 'b_b_a_a' },
            b_c: null,
            b_d: ['b_d_1', 'b_d_2', 'b_d_3'],
          },
          c: undefined,
          d: ['d_1', 'd_2', 'd_3'],
          e: MOCK_FUNCTION,
        } as const,
        '--',
      ),
    ).toEqual({
      a: 'a_a',
      'b--b_a': 'b_a_a',
      'b--b_b--b_b_a': 'b_b_a_a',
      'b--b_c': null,
      'b--b_d': ['b_d_1', 'b_d_2', 'b_d_3'],
      c: undefined,
      d: ['d_1', 'd_2', 'd_3'],
      e: MOCK_FUNCTION,
    });
  });

  test('rejects a flattened key that already exists', () => {
    expect(() => joinNestedKeys({ 'a--b': 1, a: { b: 2 } }, '--')).toThrow(
      Error,
    );
  });

  test('leaves a flat object untouched', () => {
    expect(joinNestedKeys({ a: 1, b: null }, '--')).toEqual({ a: 1, b: null });
  });
});

describe('isKeyedObject', () => {
  const SUBJECTS = [
    [{}, true],
    [{ a: 1 }, true],
    [[], false],
    [[1], false],
    [null, false],
    [undefined, false],
    ['a', false],
    [0, false],
    [MOCK_FUNCTION, false],
  ] as const;

  for (const [value, result] of SUBJECTS) {
    test(`${JSON.stringify(value) ?? String(value)} == ${result}`, () => {
      expect(isKeyedObject(value)).toBe(result);
    });
  }
});

describe('objectValuesDefined', () => {
  test('drops undefined values and keeps every other falsy value', () => {
    const value = objectValuesDefined({
      a: 1,
      b: undefined,
      c: null,
      d: 0,
      e: '',
      f: false,
    });
    expect(Object.keys(value)).toEqual(['a', 'c', 'd', 'e', 'f']);
  });

  test('returns a new object', () => {
    const source = { a: 1 };
    expect(objectValuesDefined(source)).not.toBe(source);
  });
});

describe('assignDefined', () => {
  test('mutates and returns the first value', () => {
    const target: Record<string, unknown> = { a: 1 };
    expect(assignDefined(target, { b: 2 })).toBe(target);
    expect(target).toEqual({ a: 1, b: 2 });
  });

  test('lets the last defined value win', () => {
    expect(assignDefined({ a: 1 }, { a: 2 }, { a: 3 })).toEqual({ a: 3 });
  });

  test('never overwrites an existing value with undefined', () => {
    expect(assignDefined({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
  });

  test('declares a missing key whose only value is undefined', () => {
    const value = assignDefined<Record<string, unknown>>({}, { a: undefined });
    expect(Object.keys(value)).toEqual(['a']);
    expect(value.a).toBeUndefined();
  });

  test('skips undefined arguments', () => {
    expect(
      assignDefined<Record<string, unknown>>({ a: 1 }, undefined, { b: 2 }),
    ).toEqual({ a: 1, b: 2 });
  });

  test('assigns nested objects by reference', () => {
    const nested = { b: 1 };
    expect(assignDefined<Record<string, unknown>>({}, { a: nested }).a).toBe(
      nested,
    );
  });
});

describe('extendDefined', () => {
  test('never mutates the values it was given', () => {
    const value0 = { a: 1 };
    const result = extendDefined<Record<string, unknown>>(value0, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(value0);
    expect(value0).toEqual({ a: 1 });
  });

  test('lets the last defined value win', () => {
    expect(extendDefined({ a: 1, b: 1 }, { a: 2 }, { a: undefined })).toEqual({
      a: 2,
      b: 1,
    });
  });
});

describe('mergeWithDefault', () => {
  test('fills keys no value defines', () => {
    expect(mergeWithDefault({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  test('accepts no values at all', () => {
    expect(mergeWithDefault({ a: 1 })).toEqual({ a: 1 });
  });

  test('skips undefined values', () => {
    expect(mergeWithDefault({ a: 1 }, undefined, { a: 2 })).toEqual({ a: 2 });
  });

  test('lets the last value win', () => {
    expect(mergeWithDefault({ a: 0 }, { a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  test('merges deeply rather than replacing nested objects', () => {
    expect(mergeWithDefault({ a: { b: 1, c: 2 } }, { a: { c: 3 } })).toEqual({
      a: { b: 1, c: 3 },
    });
  });

  // Contexts are accumulated by handing the parent's sub-object back in as the
  // first value. Returning (or aliasing) it let a later merge on the child
  // rewrite the parent's values.
  test('never mutates or aliases the value it was given', () => {
    const target = { a: { b: 1 } };
    const result = mergeWithDefault({ a: { b: 0 } }, target);
    expect(target).toEqual({ a: { b: 1 } });
    expect(result).not.toBe(target);
    expect(result.a).not.toBe(target.a);
  });

  test('never aliases the default it was given', () => {
    const defaultValue = { a: { b: 1 } };
    const result = mergeWithDefault(defaultValue);
    expect(result).not.toBe(defaultValue);
    expect(result.a).not.toBe(defaultValue.a);
  });

  test('a later merge on the result leaves the earlier value alone', () => {
    const parent = mergeWithDefault({ level: -1 });
    const child = mergeWithDefault({ level: -1 }, parent);
    mergeWithDefault({ level: -1 }, child, { level: child.level + 1 });
    expect(parent.level).toBe(-1);
  });
});

describe('isKeyOf', () => {
  test('reports whether the key is present', () => {
    expect(isKeyOf('a', { a: 1 })).toBe(true);
    expect(isKeyOf('b', { a: 1 })).toBe(false);
    // `in` walks the prototype chain.
    expect(isKeyOf('toString', { a: 1 })).toBe(true);
  });
});

describe('getValueOf', () => {
  test('returns the value for a present key', () => {
    expect(getValueOf({ a: 1 }, 'a')).toBe(1);
  });

  test('returns undefined for a missing or undefined key', () => {
    expect(getValueOf({ a: 1 }, 'b')).toBeUndefined();
    expect(getValueOf({ a: 1 }, undefined)).toBeUndefined();
  });
});

describe('getSubOrSelf', () => {
  test('returns the sub value when given a keyed object', () => {
    expect(getSubOrSelf('fontWeight', { fontWeight: 400 })).toBe(400);
    expect(
      getSubOrSelf('fontWeight', {} as Partial<Record<'fontWeight', number>>),
    ).toBeUndefined();
  });

  test('returns the value itself when it is not a keyed object', () => {
    expect(getSubOrSelf('fontWeight', 400)).toBe(400);
    expect(getSubOrSelf('fontWeight', 'bold')).toBe('bold');
    expect(getSubOrSelf('fontWeight', undefined)).toBeUndefined();
    expect(getSubOrSelf('fontWeight', null)).toBeNull();
  });
});
