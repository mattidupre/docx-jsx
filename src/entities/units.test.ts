import { describe, expect, test } from 'vitest';
import {
  type Units,
  type UnitsSize,
  convertUnits,
  mathUnits,
  parseUnitsSize,
  toUnits,
} from './units';

type Subject<TFunction extends (...args: any) => any> = [
  Parameters<TFunction>,
  ReturnType<TFunction>,
];

type Subjects<TFunction extends (...args: any) => any> = ReadonlyArray<
  Subject<TFunction>
>;

const argsToString = (args: ReadonlyArray<unknown>) =>
  args.map((arg) => JSON.stringify(arg)).join(',');

const subjectToString = ([args, result]: Subject<any>) =>
  `(${argsToString(args)}) == ${JSON.stringify(result)}`;

const throwsToString = (args: ReadonlyArray<unknown>) =>
  `(${argsToString(args)}) throws`;

/** Values callers can construct at runtime but that the type forbids. */
const asUnitsSize = (value: string) => value as UnitsSize;

describe('parseUnitsSize', () => {
  const SUBJECTS: Subjects<typeof parseUnitsSize> = [
    [['1in'], [1, 'in']],
    [['0in'], [0, 'in']],
    [['8.5in'], [8.5, 'in']],
    [['21cm'], [21, 'cm']],
    [['29.7cm'], [29.7, 'cm']],
    // One grammar for every unit the library understands: the model that only
    // knew `in`/`cm` refused these.
    [['16px'], [16, 'px']],
    [['10.5pt'], [10.5, 'pt']],
    [['1.5rem'], [1.5, 'rem']],
    // Negative lengths are legal CSS and mathUnits('subtract') produces them.
    [['-1in'], [-1, 'in']],
    [['-0.25cm'], [-0.25, 'cm']],
    // A leading dot is legal CSS shorthand for "0.".
    [[asUnitsSize('.5in')], [0.5, 'in']],
    [[asUnitsSize('-.5cm')], [-0.5, 'cm']],
    // String(number) falls back to exponent notation for extreme values.
    [[asUnitsSize('1e-7in')], [1e-7, 'in']],
    [[asUnitsSize('1.5e+3cm')], [1500, 'cm']],
    // Units match case-insensitively.
    [[asUnitsSize('2IN')], [2, 'in']],
    [[asUnitsSize('12PX')], [12, 'px']],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(parseUnitsSize(...subject[0])).toEqual(subject[1]);
    });
  }

  // The pattern is built from a regular expression literal rather than a plain
  // string so that `\.` stays an escaped dot instead of decaying into the "any
  // character" wildcard a template literal would produce: "1x5in" parsed as
  // 1in before that fix.
  const ERROR_SUBJECTS: ReadonlyArray<Parameters<typeof parseUnitsSize>> = [
    [asUnitsSize('')],
    [asUnitsSize('in')],
    [asUnitsSize('px')],
    [asUnitsSize('1')],
    [asUnitsSize('0')],
    [asUnitsSize('1x5in')],
    [asUnitsSize('1-5in')],
    [asUnitsSize('1 in')],
    [asUnitsSize('1in ')],
    [asUnitsSize('1.in')],
    [asUnitsSize('--1in')],
    [asUnitsSize('NaNin')],
    [asUnitsSize('NaNpx')],
    [asUnitsSize('Infinityin')],
    [asUnitsSize('10pxpx')],
    [asUnitsSize('abc')],
    // Units the library deliberately does not resolve.
    [asUnitsSize('1pc')],
    [asUnitsSize('1mm')],
    [asUnitsSize('1em')],
    [asUnitsSize('50%')],
    [asUnitsSize('2ex')],
    [asUnitsSize('2ch')],
    [asUnitsSize('10vw')],
    [asUnitsSize('10vh')],
    [undefined as unknown as UnitsSize],
  ];

  for (const args of ERROR_SUBJECTS) {
    test(throwsToString(args), () => {
      expect(() => parseUnitsSize(...args)).toThrow(TypeError);
    });
  }

  test('names the relative unit it refuses', () => {
    expect(() => parseUnitsSize(asUnitsSize('1em'))).toThrow(
      /relative unit "em"/,
    );
  });

  test('lists the supported units when the unit is unknown', () => {
    expect(() => parseUnitsSize(asUnitsSize('1pc'))).toThrow(
      /px, pt, rem, cm, or in/,
    );
  });
});

/**
 * CSS pins the absolute lengths to each other exactly: `1in` is `96px`, `72pt`
 * and `2.54cm`, and this library resolves `1rem` against a 16px root.
 */
describe('convertUnits', () => {
  const SUBJECTS: Subjects<typeof convertUnits> = [
    [['1in', 'pt'], 72],
    [['1in', 'px'], 96],
    [['1in', 'cm'], 2.54],
    [['96px', 'in'], 1],
    [['16px', 'pt'], 12],
    [['16px', 'rem'], 1],
    [['1rem', 'px'], 16],
    [['1rem', 'pt'], 12],
    [['2.54cm', 'in'], 1],
    [['1cm', 'pt'], 28.346456692913385],
    [['-8px', 'pt'], -6],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(convertUnits(...subject[0])).toBeCloseTo(subject[1], 9);
    });
  }

  test('returns a value already in the target units unchanged', () => {
    // Multiplying and dividing by the same ratio would introduce floating
    // point noise into a length the caller wrote exactly.
    expect(convertUnits('29.7cm', 'cm')).toBe(29.7);
    expect(convertUnits('0.1in', 'in')).toBe(0.1);
  });

  test('round-trips through every pair of units', () => {
    const units: ReadonlyArray<Units> = ['px', 'pt', 'rem', 'cm', 'in'];
    for (const fromUnits of units) {
      for (const toUnitsName of units) {
        expect(
          convertUnits(
            toUnits(
              convertUnits(toUnits(3, fromUnits), toUnitsName),
              toUnitsName,
            ),
            fromUnits,
          ),
          `${fromUnits} -> ${toUnitsName}`,
        ).toBeCloseTo(3, 9);
      }
    }
  });

  test('propagates the units it refuses', () => {
    expect(() => convertUnits(asUnitsSize('1em'), 'pt')).toThrow(TypeError);
  });
});

describe('toUnits', () => {
  const SUBJECTS: Subjects<typeof toUnits> = [
    [[1, 'in'], '1in'],
    [[0, 'cm'], '0cm'],
    [[-1.25, 'in'], '-1.25in'],
    [[16, 'px'], '16px'],
    [[1.5, 'rem'], '1.5rem'],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(toUnits(...subject[0])).toEqual(subject[1]);
    });
  }

  const ERROR_SUBJECTS: ReadonlyArray<Parameters<typeof toUnits>> = [
    [1, 'em' as Units],
    [1, 'mm' as Units],
    // Never emit "NaNin"/"Infinityin", which nothing can read back.
    [Number.NaN, 'in'],
    [Number.POSITIVE_INFINITY, 'cm'],
  ];

  for (const args of ERROR_SUBJECTS) {
    test(throwsToString(args), () => {
      expect(() => toUnits(...args)).toThrow(TypeError);
    });
  }

  test('round-trips through parseUnitsSize', () => {
    expect(parseUnitsSize(toUnits(-0.5, 'in'))).toEqual([-0.5, 'in']);
    expect(parseUnitsSize(toUnits(1e-7, 'cm'))).toEqual([1e-7, 'cm']);
    expect(parseUnitsSize(toUnits(12, 'px'))).toEqual([12, 'px']);
  });
});

describe('mathUnits', () => {
  const SUBJECTS: Subjects<typeof mathUnits> = [
    [['add', '1in', '2in'], '3in'],
    [['add', '1in', 2], '3in'],
    [['add', '1in', '-2in'], '-1in'],
    [['subtract', '8.5in', '0.5in'], '8in'],
    [['subtract', '0.5in', '8.5in'], '-8in'],
    [['subtract', '8.5in', 1], '7.5in'],
    [['multiply', '2cm', 3], '6cm'],
    [['multiply', '2cm', '0.5cm'], '1cm'],
    // The unit model the DOM target measures a page with now understands every
    // unit the typography model does.
    [['multiply', '16px', 2], '32px'],
    [['add', '10pt', '2pt'], '12pt'],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(mathUnits(...subject[0])).toEqual(subject[1]);
    });
  }

  /**
   * Mixed units used to throw. They are converted into the units of the first
   * operand instead, so a page declared in inches and a margin declared in
   * centimetres still add up.
   */
  const MIXED_SUBJECTS: ReadonlyArray<
    [Parameters<typeof mathUnits>, number, Units]
  > = [
    [['add', '1in', '2.54cm'], 2, 'in'],
    [['subtract', '1in', '48px'], 0.5, 'in'],
    [['add', '12pt', '1rem'], 24, 'pt'],
    [['subtract', '2cm', '0.5in'], 0.73, 'cm'],
  ];

  for (const [args, amount, units] of MIXED_SUBJECTS) {
    test(`(${argsToString(args)}) == ${amount}${units}`, () => {
      const [resultAmount, resultUnits] = parseUnitsSize(mathUnits(...args));
      expect(resultUnits).toBe(units);
      expect(resultAmount).toBeCloseTo(amount, 9);
    });
  }

  const ERROR_SUBJECTS: ReadonlyArray<Parameters<typeof mathUnits>> = [
    ['subtract', asUnitsSize('1x5in'), '2in'],
    ['add', '1in', asUnitsSize('1em')],
    [
      'divide' as Parameters<typeof mathUnits>[0],
      asUnitsSize('1in'),
      asUnitsSize('2in'),
    ],
  ];

  for (const args of ERROR_SUBJECTS) {
    test(throwsToString(args), () => {
      expect(() => mathUnits(...args)).toThrow(TypeError);
    });
  }
});
