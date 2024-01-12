import {
  test,
  expect,
  describe,
  vi,
  beforeEach,
  afterEach,
  type SpyInstance,
} from 'vitest';
import { toDocxColor } from './toDocxColor';

let warn: SpyInstance;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toDocxColor', () => {
  const expectValue = (value: any) => {
    expect(value).toMatch(/^[0-9a-f]{6}$/);
    expect(value).toMatchSnapshot();
  };

  for (const input of [
    'red',
    '#f00',
    '#ff0000',
    'rgb(255, 0, 0)',
    'oklch(70% 0.197 22.73)',
  ] as const) {
    test(`with ${input}`, () => {
      const result = toDocxColor(input);
      expectValue(result);
    });
  }

  for (const input of ['rgba(255, 0, 0, 0.5)'] as const) {
    test(`with ${input} [WARNS]`, () => {
      const result = toDocxColor(input);
      expectValue(result);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  }

  test('with currentColor', () => {
    expect(toDocxColor('currentColor')).toBe(undefined);
  });

  test('with undefined', () => {
    expect(toDocxColor(undefined)).toBe(undefined);
  });

  test('with ""', () => {
    expect(toDocxColor('')).toBe(undefined);
  });
});
