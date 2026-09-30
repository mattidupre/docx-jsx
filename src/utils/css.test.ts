import { expect, test, describe } from 'vitest';
import { toVarDeclaration, flattenCssVariables } from './css';

describe('toVarDeclaration', () => {
  test('passing a single variable in format --var', () => {
    expect(toVarDeclaration('--one')).toEqual('var(--one)');
  });
  test('passing a single variable in format var(--var)', () => {
    expect(toVarDeclaration('var(--one)')).toEqual('var(--one)');
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
    expect(toVarDeclaration(['--one', 'var(--two)', 'red'])).toEqual(
      'var(--one, var(--two, red))',
    );
  });
  test('passing non-variable keys ending with a non-variable', () => {
    expect(toVarDeclaration(['red', 'white', 'blue'])).toEqual('red');
  });
  test('passing non-variable keys ending with a variable', () => {
    expect(toVarDeclaration(['red', 'white', '--three'])).toEqual('red');
  });
});

test('flattenCssVariables', () => {
  expect(flattenCssVariables('foo')).toEqual(['foo']);
  expect(flattenCssVariables('var(--foo)')).toEqual(['--foo']);
  expect(flattenCssVariables('var(--foo, bar)')).toEqual(['--foo', 'bar']);
  expect(flattenCssVariables('var(--foo, var(--bar, baz))')).toEqual([
    '--foo',
    '--bar',
    'baz',
  ]);
  expect(flattenCssVariables(' var( --foo,  var(--bar,baz )   )')).toEqual([
    '--foo',
    '--bar',
    'baz',
  ]);
  expect(flattenCssVariables('fn(--foo)')).toEqual(['fn(--foo)']);
  expect(flattenCssVariables('fn(var(--foo))')).toEqual(['fn(var(--foo))']);
  expect(flattenCssVariables('var(var(--foo))')).toEqual(['--foo']);
  expect(() => flattenCssVariables('var(var(--foo)')).toThrow();
});
