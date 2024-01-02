import { expect, test, describe } from 'vitest';
import { joinNestedKeys } from './object';

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
});
