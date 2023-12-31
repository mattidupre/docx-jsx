import { expect, test, describe } from 'vitest';
import { objectToCssVars, cssVarProperty } from './cssVars';

describe('cssVarProperty', () => {
  test('passing a single key', () => {
    expect(cssVarProperty('--one')).toEqual('var(--one)');
  });
  test('passing a single with default', () => {
    expect(cssVarProperty('--one', 'value')).toEqual('var(--one, value)');
  });
  test('passing multiple keys', () => {
    expect(cssVarProperty(['--one', '--two', '--three'])).toEqual(
      'var(--one, var(--two, var(--three)))',
    );
  });
  test('passing multiple keys with default', () => {
    expect(cssVarProperty(['--one', '--two', '--three'], 'default')).toEqual(
      'var(--one, var(--two, var(--three, default)))',
    );
  });
});

describe('objectToCssVars', () => {
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
            { prefix: 'CamelCase' },
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
            { prefix: 'CamelCase' },
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
});
