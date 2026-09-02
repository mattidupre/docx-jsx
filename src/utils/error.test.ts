import { describe, expect, test } from 'vitest';
import { isErrorObject, stringifyErrorObject } from './error';

describe('isErrorObject', () => {
  const SUBJECTS = [
    // Anything that is not an { error } object, including the values that used
    // to throw a TypeError instead of returning false.
    [null, false],
    [undefined, false],
    [0, false],
    ['', false],
    ['error', false],
    [false, false],
    [[], false],
    [{}, false],
    [{ error: undefined }, false],
    [{ error: null }, false],
    [{ error: '' }, false],
    [new Error('bare error'), false],
    [{ error: 'failed' }, true],
    [{ error: new Error('failed') }, true],
  ] as const;

  for (const [value, expected] of SUBJECTS) {
    test(`${JSON.stringify(value) ?? String(value)} == ${expected}`, () => {
      expect(isErrorObject(value)).toBe(expected);
    });
  }
});

describe('stringifyErrorObject', () => {
  const SUBJECTS = [
    [new Error('boom'), 'boom'],
    ['boom', 'boom'],
    [12, '12'],
    [null, 'null'],
    [undefined, 'undefined'],
  ] as const;

  for (const [error, expected] of SUBJECTS) {
    test(`${String(error)} == ${expected}`, () => {
      expect(stringifyErrorObject({ error })).toBe(expected);
    });
  }
});
