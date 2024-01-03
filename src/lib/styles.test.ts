import { test, expect } from 'vitest';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { variantsToCssRules, variantsToCssString } from './styles';

const createOptions = () => ({
  variants: createMockVariantsConfig(),
  prefixes: createMockPrefixesConfig(),
});

test('variantsToCssRules', () => {
  const cssRules = variantsToCssRules(createOptions());
  expect(cssRules).toMatchSnapshot();

  for (const rule of cssRules) {
    console.log(`${rule[0]}: \n${JSON.stringify(rule[1], undefined, 2)}\n`);
  }
});

test('variantsToCssString', () => {
  const cssString = variantsToCssString(createOptions());
  console.log(cssString);
});
