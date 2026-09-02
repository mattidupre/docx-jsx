import { describe, expect, test } from 'vitest';
import { joinKebab, prefixKebab, toLowercase } from './string';

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

describe('joinKebab', () => {
  runSubjects(
    [
      [[], ''],
      [[undefined], ''],
      [['a'], 'a'],
      // Every argument is kebab-cased, including the first.
      [['FooBar'], 'foo-bar'],
      [['FooBar', 'bazQux'], 'foo-bar-baz-qux'],
      [['matti-docs', 'fontWeight'], 'matti-docs-font-weight'],
      // lodash splits letter/digit boundaries, so variant names gain a dash.
      [['prefix', 'heading1'], 'prefix-heading-1'],
      // Empty and undefined arguments never leave a dangling separator.
      [[undefined, 'a'], 'a'],
      [['a', undefined, 'b'], 'a-b'],
      [['a', ''], 'a'],
    ] as const,
    joinKebab,
  );
});

describe('prefixKebab', () => {
  runSubjects(
    [
      [[], ''],
      [[undefined], ''],
      [['matti-docs'], 'matti-docs'],
      // The prefix is passed through verbatim; only the rest is kebab-cased.
      [['Matti-Docs', 'fontWeight'], 'Matti-Docs-font-weight'],
      [['matti_docs', 'fontWeight'], 'matti_docs-font-weight'],
      [['matti-docs-variant', 'heading1'], 'matti-docs-variant-heading-1'],
      [[undefined, 'fontWeight'], 'font-weight'],
      [['p', undefined, 'a'], 'p-a'],
      [['', 'a'], 'a'],
    ] as const,
    prefixKebab,
  );
});
