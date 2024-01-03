import { expect, test, describe } from 'vitest';
import { toVarDeclaration, objectToVarValues } from './css';

describe('toVarDeclaration', () => {
  test('passing a single variable', () => {
    expect(toVarDeclaration('--one')).toEqual('var(--one)');
  });
  test('passing a single non-variable', () => {
    expect(toVarDeclaration('red')).toEqual('red');
  });
  test('passing variable keys ending with a variable', () => {
    expect(toVarDeclaration(['--one', '--two', '--three'])).toEqual(
      'var(--one, var(--two, var(--three)))',
    );
  });
  test('passing variable keys ending with a non-variable', () => {
    expect(toVarDeclaration(['--one', '--two', 'red'])).toEqual(
      'var(--one, var(--two, red))',
    );
  });
  test('passing non-variable keys ending with a non-variable', () => {
    expect(() => toVarDeclaration(['red', 'white', 'blue'])).toThrow();
  });
  test('passing non-variable keys ending with a variable', () => {
    expect(() => toVarDeclaration(['red', 'white', '--three'])).toThrow();
  });
});

describe('objectToVarValues', () => {
  describe('passing undefined', () => {
    test('returns an empty object', () => {
      expect(objectToVarValues(undefined)).toEqual({});
    });
  });

  describe('passing empty object', () => {
    test('returns an empty object', () => {
      expect(objectToVarValues({})).toEqual({});
    });
  });

  describe('passing a flat object', () => {
    describe('without prefix', () => {
      test('returns an object of vars', () => {
        expect(
          objectToVarValues({
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
          objectToVarValues(
            {
              one: 'alpha',
              two: 'beta',
              three: 'gamma',
            },
            { prefix: 'CamelCase' },
          ),
        ).toEqual({
          '--CamelCase-one': 'alpha',
          '--CamelCase-two': 'beta',
          '--CamelCase-three': 'gamma',
        });
      });
    });
  });

  describe('passing a deep object', () => {
    describe('without prefix', () => {
      test('returns an object of vars', () => {
        expect(
          objectToVarValues({
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
          objectToVarValues(
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
          '--CamelCase-one': 'alpha',
          '--CamelCase-two': 'beta',
          '--CamelCase-three-four': 'delta',
          '--CamelCase-three-five': 'epsilon',
        });
      });
    });
  });
});
