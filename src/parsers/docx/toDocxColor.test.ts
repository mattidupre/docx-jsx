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

describe('toDocxColor values', () => {
  // Word wants six hex digits with no leading "#", whatever CSS colour syntax
  // the typography options were authored in.
  const SUBJECTS = [
    ['red', 'ff0000'],
    ['blue', '0000ff'],
    ['#f00', 'ff0000'],
    ['#ff0000', 'ff0000'],
    ['#0f8', '00ff88'],
    ['rgb(255, 0, 0)', 'ff0000'],
    ['rgb(0, 128, 255)', '0080ff'],
    ['hsl(120 100% 50%)', '00ff00'],
    ['oklch(70% 0.197 22.73)', 'ff6062'],
  ] as const;

  for (const [input, expected] of SUBJECTS) {
    test(`(${JSON.stringify(input)}) == ${JSON.stringify(expected)}`, () => {
      expect(toDocxColor(input)).toBe(expected);
      expect(warn).not.toHaveBeenCalled();
    });
  }

  // OOXML has no alpha channel on w:color, so transparency is dropped loudly.
  const ALPHA_SUBJECTS = [
    ['rgba(255, 0, 0, 0.5)', 'ff0000'],
    ['#ff000080', 'ff0000'],
  ] as const;

  for (const [input, expected] of ALPHA_SUBJECTS) {
    test(`(${JSON.stringify(input)}) == ${JSON.stringify(
      expected,
    )} [WARNS]`, () => {
      expect(toDocxColor(input)).toBe(expected);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        `Transparency value ignored for color ${input}`,
      );
    });
  }

  for (const input of ['notacolor', '#ff00', 'rgb(1, 2)'] as const) {
    test(`(${JSON.stringify(input)}) throws`, () => {
      expect(() => toDocxColor(input)).toThrow();
    });
  }
});
