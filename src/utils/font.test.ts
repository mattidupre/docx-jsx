import { describe, expect, test } from 'vitest';
import {
  getMatchedFontWeightIndexes,
  fontWeightToInteger,
  matchFontFace,
} from './font';

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

describe('fontWeightToInteger', () => {
  const HAPPY_SUBJECTS: Subjects<typeof fontWeightToInteger> = [
    [[100], 100],
    [['100'], 100],
    [['normal'], 400],
    [['bold'], 700],
    [[undefined], 400],
    [[{}], 400],
    [[{ fontWeight: '600' }], 600],
  ];

  for (const subject of HAPPY_SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(fontWeightToInteger(...subject[0])).toEqual(subject[1]);
    });
  }

  const ERROR_SUBJECTS: Subjects<typeof fontWeightToInteger> = [
    [[-1], Error],
    [['test' as any], Error],
    [[1001], Error],
    [['1001'], Error],
    [[null], Error],
  ];

  for (const subject of ERROR_SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(() => fontWeightToInteger(...subject[0])).toThrow();
    });
  }
});

describe('getMatchedFontWeightIndexes', () => {
  const SUBJECTS: Subjects<typeof getMatchedFontWeightIndexes> = [
    // If the target weight given is between 400 and 500 inclusive:
    // - Look for available weights between the target and 500, in ascending order.
    [['400', [1, 400, 450, 500, 1000]], [1]],
    [['401', [1, 400, 450, 500, 1000]], [2]],
    [['451', [1, 400, 450, 500, 1000]], [3]],
    [['500', [1, 400, 450, 500, 1000]], [3]],
    // - If no match is found, look for available weights less than the target, in descending order.
    [['450', [1, 2, 501, 1000]], [1]],

    // - If no match is found, look for available weights greater than 500, in ascending order.
    [['450', [501, 1000]], [0]],

    // If a weight less than 400 is given,
    // - look for available weights less than the target, in descending order.
    [['200', [1, 2, 400, 450, 500, 1000]], [1]],

    // - If no match is found, look for available weights greater than the target, in ascending order.
    [['200', [400, 450, 500, 1000]], [0]],

    // If a weight greater than 500 is given
    // - look for available weights greater than the target, in ascending order.
    [['501', [1, 400, 450, 500, 999, 1000]], [4]],

    // - If no match is found, look for available weights less than the target, in descending order.
    [['501', [1, 400, 450, 500]], [3]],

    // Other cases
    [['450', []], []],
    [['400', [1000, 300, 900, 400]], [3]],
    [
      ['450', [1, 450, 450, 1000]],
      [1, 2],
    ],
    [
      ['450', [1, 450, { fontWeight: 450 }, 1000]],
      [1, 2],
    ],
    [
      [{ fontWeight: '450' }, [1, 450, 450, 1000]],
      [1, 2],
    ],
    [[undefined, [1, 400, 1000]], [1]],
    [[undefined, [1, undefined, 1000]], [1]],
    [[400, [1, undefined, 1000]], [1]],
    [
      ['450', [1, 400, 'normal', 1000]],
      [1, 2],
    ],
  ] as const;

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(getMatchedFontWeightIndexes(...subject[0])).toEqual(subject[1]);
    });
  }
});

describe('matchFont', () => {
  const SUBJECTS: Subjects<typeof matchFontFace> = [
    [
      [
        [
          { fontWeight: 100 },
          { fontWeight: 400 },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        { fontWeight: 400 },
      ],
      { fontWeight: 400 },
    ],
    [
      [
        [
          { fontWeight: 100 },
          { fontWeight: 400, fontStyle: 'italic' },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        { fontWeight: 700, fontStyle: 'italic' },
      ],
      { fontWeight: 400, fontStyle: 'italic' },
    ],
    [
      [
        [
          { fontWeight: 100 },
          { fontWeight: 400, fontStyle: 'oblique' },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        { fontWeight: 700, fontStyle: 'italic' },
      ],
      { fontWeight: 400, fontStyle: 'oblique' },
    ],
    [
      [
        [
          { fontWeight: 100 },
          { fontWeight: 400, fontStyle: 'normal' },
          { fontWeight: 400, fontStyle: 'oblique' },
          { fontWeight: 400, fontStyle: 'italic' },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        { fontWeight: 700, fontStyle: 'italic' },
      ],
      { fontWeight: 400, fontStyle: 'italic' },
    ],
    [
      [
        [
          { fontWeight: 100 },
          {},
          { fontWeight: 400, fontStyle: 'oblique' },
          { fontWeight: 400, fontStyle: 'italic' },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        {},
      ],
      {},
    ],
    [
      [
        [
          { fontWeight: 100 },
          {},
          { fontWeight: 400, fontStyle: 'oblique' },
          { fontWeight: 400, fontStyle: 'italic' },
          { fontWeight: 700 },
          { fontWeight: 900 },
        ],
        {},
      ],
      {},
    ],
  ] as const;

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(matchFontFace(...subject[0])).toEqual(subject[1]);
    });
  }
});
