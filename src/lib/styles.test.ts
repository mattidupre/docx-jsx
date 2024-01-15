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
});

test('createStyleString', () => {
  const cssString = createStyleString(createOptions());
  expect(cssString).toMatchSnapshot();
});
