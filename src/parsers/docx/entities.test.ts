import { describe, expect, test } from 'vitest';
import type { UnitsSize } from '../../entities';
import { toPt, toTwip } from './entities';

type Subject<
  TFunction extends (...args: any) => any,
  TArgs extends ReadonlyArray<any> = Parameters<TFunction>,
> = [TArgs, Error | Error['constructor'] | ReturnType<TFunction>];

type Subjects<
  TFunction extends (...args: any) => any,
  TArgs extends ReadonlyArray<any> = Parameters<TFunction>,
> = ReadonlyArray<Subject<TFunction, TArgs>>;

const subjectToString = ([args, result]: Subject<any>) =>
  `(${args.map((a) => JSON.stringify(a)).join(',')}) == ${
    result ? JSON.stringify(result) : 'throws'
  }`;

describe('toPt', () => {
  const HAPPY_SUBJECTS: Subjects<typeof toPt> = [
    // 1pt is the base unit.
    [['0pt'], 0],
    [['12pt'], 12],
    [['10.5pt'], 10.5],
    [['-6pt'], -6],
    // 1px is 3/4pt (CSS reference pixel).
    [['16px'], 12],
    [['1px'], 0.75],
    [['-8px'], -6],
    // 1rem is ROOT_FONT_SIZE_PX (16) px.
    [['1rem'], 12],
    [['0.25rem'], 3],
    [['2rem'], 24],
    [['.5rem'], 6],
    // 1in is 72pt.
    [['1in'], 72],
    [['8.5in'], 612],
    // CSS defines 1in as exactly 2.54cm, so 1cm is 72/2.54pt. (The unit model
    // used to approximate the ratio as 0.3937008in per cm, which differs from
    // this in the seventh decimal and rounds to the same twip everywhere.)
    [['1cm'], 28.346456692913385],
    // Exponent notation is a valid `${number}` template literal value.
    [['1e2px'], 75],
  ];

  for (const subject of HAPPY_SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(toPt(...subject[0])).toBeCloseTo(subject[1] as number, 9);
    });
  }

  const ERROR_SUBJECTS: Subjects<typeof toPt> = [
    // Relative units depend on the cascade, which DOCX has no access to.
    [['1em' as UnitsSize], TypeError],
    [['50%' as UnitsSize], TypeError],
    [['2ex' as UnitsSize], TypeError],
    [['2ch' as UnitsSize], TypeError],
    [['10vw' as UnitsSize], TypeError],
    [['10vh' as UnitsSize], TypeError],
    // Unknown or missing units.
    [['1pc' as UnitsSize], TypeError],
    [['1mm' as UnitsSize], TypeError],
    [['0' as UnitsSize], TypeError],
    [['10' as UnitsSize], TypeError],
    [['' as UnitsSize], TypeError],
    [['px' as UnitsSize], TypeError],
    // Malformed values must not be silently accepted by a suffix check.
    [['10 px' as UnitsSize], TypeError],
    [['10pxpx' as UnitsSize], TypeError],
    [['abc' as UnitsSize], TypeError],
    [['NaNpx' as UnitsSize], TypeError],
    [[undefined as unknown as UnitsSize], TypeError],
  ];

  for (const subject of ERROR_SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(() => toPt(...subject[0])).toThrow(TypeError);
    });
  }

  test('names the relative unit it refuses', () => {
    expect(() => toPt('1em' as UnitsSize)).toThrow(/relative unit "em"/);
  });

  test('lists the supported units when the unit is unknown', () => {
    expect(() => toPt('1pc' as UnitsSize)).toThrow(/px, pt, rem, cm, or in/);
  });
});

describe('toTwip', () => {
  const HAPPY_SUBJECTS: Subjects<typeof toTwip> = [
    // 1pt is 20 twips.
    [['1pt'], 20],
    [['12pt'], 240],
    [['1rem'], 240],
    [['0.25rem'], 60],
    [['16px'], 240],
    [['1in'], 1440],
    [['8.5in'], 12240],
    [['-1rem'], -240],
  ];

  for (const subject of HAPPY_SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(toTwip(...subject[0])).toBeCloseTo(subject[1] as number, 9);
    });
  }

  test('propagates invalid units', () => {
    expect(() => toTwip('1em' as UnitsSize)).toThrow(TypeError);
  });
});
