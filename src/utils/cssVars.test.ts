import { expect, test, describe } from 'vitest';
import { objectToCssVars } from './cssVars.js';

describe('passing undefined', () => {
  test('returns an empty object', () => {
    expect(objectToCssVars(undefined)).toEqual({});
  });
});

describe('passing empty object', () => {
  test('returns an empty object', () => {
    expect(objectToCssVars({})).toEqual({});
  });
});

describe('passing a flat object', () => {
  describe('without prefix', () => {
    test('returns an object of vars', () => {
      expect(
        objectToCssVars({
          one: 'alpha',
          two: 'beta',
          three: 'gamma',
        }),
      ).toEqual({
        '--one': 'alpha',
        '--two': 'beta',
        '--three': 'gamma',
      });
    });
  });

  describe('with prefix', () => {
    test('returns an object of vars', () => {
      expect(
        objectToCssVars(
          {
            one: 'alpha',
            two: 'beta',
            three: 'gamma',
          },
          'CamelCase',
        ),
      ).toEqual({
        '--camel-case-one': 'alpha',
        '--camel-case-two': 'beta',
        '--camel-case-three': 'gamma',
      });
    });
  });
});

describe('passing a deep object', () => {
  describe('without prefix', () => {
    test('returns an object of vars', () => {
      expect(
        objectToCssVars({
          one: 'alpha',
          two: 'beta',
          three: {
            four: 'delta',
            five: 'epsilon',
          },
        }),
      ).toEqual({
        '--one': 'alpha',
        '--two': 'beta',
        '--three-four': 'delta',
        '--three-five': 'epsilon',
      });
    });
  });

  describe('with prefix', () => {
    test('returns an object of vars', () => {
      expect(
        objectToCssVars(
          {
            one: 'alpha',
            two: 'beta',
            three: {
              four: 'delta',
              five: 'epsilon',
            },
          },
          'CamelCase',
        ),
      ).toEqual({
        '--camel-case-one': 'alpha',
        '--camel-case-two': 'beta',
        '--camel-case-three-four': 'delta',
        '--camel-case-three-five': 'epsilon',
      });
    });
  });
});
