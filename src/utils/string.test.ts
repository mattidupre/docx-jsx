import { describe, expect, test } from 'vitest';
import { toLowercase } from './string';

const argsToString = (args: ReadonlyArray<unknown>) =>
  args.map((arg) => JSON.stringify(arg)).join(',');

const runSubjects = <TArgs extends ReadonlyArray<any>, TResult>(
  subjects: ReadonlyArray<readonly [TArgs, TResult]>,
  run: (...args: TArgs) => TResult,
) => {
  for (const [args, result] of subjects) {
    test(`(${argsToString(args)}) == ${JSON.stringify(result)}`, () => {
      expect(run(...args)).toEqual(result);
    });
  }
};

describe('toLowercase', () => {
  runSubjects(
    [
      [['ABC'], 'abc'],
      [['MyApp-Name'], 'myapp-name'],
      [['already-lower'], 'already-lower'],
      [[''], ''],
    ] as const,
    toLowercase,
  );
});
