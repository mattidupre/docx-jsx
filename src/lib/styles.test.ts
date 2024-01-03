import { test, expect } from 'vitest';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { createStyleArray, createStyleString } from './styles';

const createOptions = () => ({
  variants: createMockVariantsConfig(),
  prefixes: createMockPrefixesConfig(),
});

test('createStyleArray', () => {
  const cssRules = createStyleArray(createOptions());
  expect(cssRules).toMatchSnapshot();

  for (const rule of cssRules) {
    console.log(`${rule[0]}: \n${JSON.stringify(rule[1], undefined, 2)}\n`);
  }
});

test('createStyleString', () => {
  const cssString = createStyleString(createOptions());
  console.log(cssString);
});
