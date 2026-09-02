import { describe, expect, test } from 'vitest';
import {
  indexesOf,
  isAllValuesInArray,
  isAnyValuesInArray,
  isValueInArray,
  joinArrayStrings,
  pickFromArray,
  pluckFromArray,
  toDefinedArray,
} from './array';

const argsToString = (args: ReadonlyArray<unknown>) =>
  args.map((arg) => JSON.stringify(arg)).join(',');

const runSubjects = <TArgs extends ReadonlyArray<any>, TResult>(
  subjects: ReadonlyArray<readonly [TArgs, TResult]>,
  run: (...args: TArgs) => TResult,
) => {
  for (const [args, result] of subjects) {
    test(`(${argsToString(args)}) == ${JSON.stringify(result)}`, () => {
      expect(run(...args)).toEqual(result);
    });
  }
};

describe('toDefinedArray', () => {
  runSubjects(
    [
      [[undefined], []],
      [[[]], []],
      [[[1, undefined, 2]], [1, 2]],
      [[[undefined, undefined]], []],
      // A lone value is wrapped, and null is a value, not a hole.
      [['a'], ['a']],
      [[null], [null]],
      [[0], [0]],
      [[false], [false]],
      [[{ a: 1 }], [{ a: 1 }]],
      // Only the top level is flattened away; nested arrays survive.
      [[[[1], [2]]], [[1], [2]]],
    ] as const,
    toDefinedArray,
  );
});

describe('joinArrayStrings', () => {
  runSubjects(
    [
      [[undefined, '-'], ''],
      [[[], '-'], ''],
      [['a', '-'], 'a'],
      [[['a', 'b'], '-'], 'a-b'],
      // Empty strings and non-string, non-number values are dropped.
      [[['a', '', 'b'], '-'], 'a-b'],
      [[[undefined, 'a', null, false, 'b'], '-'], 'a-b'],
      // Numbers survive, including 0.
      [[[0, 'a'], '-'], '0-a'],
      [[[1, 2], '-'], '1-2'],
      // The value is flattened to any depth first.
      [[[['a', ['b', ['c']]], 'd'], '-'], 'a-b-c-d'],
      [[['a', 'b'], ''], 'ab'],
    ] as const,
    joinArrayStrings,
  );
});

describe('pickFromArray', () => {
  test('picks a single key from every entry', () => {
    expect(pickFromArray([{ a: 1, b: 2 }, { a: 3 }], 'a')).toEqual([
      { a: 1 },
      { a: 3 },
    ]);
  });

  test('declares every requested key even when an entry lacks it', () => {
    const result = pickFromArray([{ a: 1, b: 2 }, { b: 3 }], ['a', 'b']);
    expect(result).toEqual([
      { a: 1, b: 2 },
      { a: undefined, b: 3 },
    ]);
    expect(Object.keys(result[1])).toEqual(['a', 'b']);
  });

  test('replaces an undefined entry with an all-undefined object', () => {
    expect(pickFromArray([undefined, { a: 1 }], ['a'])).toEqual([
      { a: undefined },
      { a: 1 },
    ]);
  });

  test('returns a distinct object per entry', () => {
    const result = pickFromArray([{ a: 1 }, { a: 2 }], ['a']);
    expect(result[0]).not.toBe(result[1]);
  });

  test('returns an empty array for an empty array', () => {
    expect(pickFromArray([] as ReadonlyArray<{ a?: number }>, ['a'])).toEqual(
      [],
    );
  });
});

describe('pluckFromArray', () => {
  test('collects the key from every entry', () => {
    expect(pluckFromArray([{ a: 1 }, { a: 2 }], 'a')).toEqual([1, 2]);
  });

  test('drops entries whose value is undefined', () => {
    expect(pluckFromArray([{ a: 1 }, { b: 2 }, undefined], 'a')).toEqual([1]);
  });

  test('keeps falsy values that are not undefined', () => {
    expect(pluckFromArray([{ a: 0 }, { a: '' }, { a: null }], 'a')).toEqual([
      0,
      '',
      null,
    ]);
  });

  test('returns an empty array for an empty array', () => {
    expect(pluckFromArray([] as ReadonlyArray<{ a?: number }>, 'a')).toEqual(
      [],
    );
  });
});

describe('isValueInArray', () => {
  runSubjects(
    [
      [[1, [1, 2, 3]], true],
      [[4, [1, 2, 3]], false],
      [['1', [1, 2, 3]], false],
      [[undefined, []], false],
      [[undefined, [undefined]], true],
    ] as const,
    isValueInArray,
  );
});

describe('isAllValuesInArray', () => {
  runSubjects(
    [
      [[[1, 2, 3], 1, 2], true],
      [[[1, 2, 3], 1, 4], false],
      // Vacuously true: nothing was asked for.
      [[[1, 2, 3]], true],
      [[[]], true],
      [[[], 1], false],
    ] as const,
    isAllValuesInArray,
  );
});

describe('isAnyValuesInArray', () => {
  runSubjects(
    [
      [[[1, 2, 3], 4, 2], true],
      [[[1, 2, 3], 4, 5], false],
      [[[1, 2, 3]], false],
      [[[], 1], false],
    ] as const,
    isAnyValuesInArray,
  );
});

describe('indexesOf', () => {
  runSubjects(
    [
      [
        [[1, 2, 1, 1], 1],
        [0, 2, 3],
      ],
      [[[1, 2, 3], 4], []],
      [[[], 1], []],
      [
        [[undefined, 1, undefined], undefined],
        [0, 2],
      ],
      // Strict equality, so NaN never matches itself.
      [[[Number.NaN], Number.NaN], []],
    ] as const,
    indexesOf,
  );
});
