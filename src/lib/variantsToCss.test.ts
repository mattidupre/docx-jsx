import { expect, test, describe } from 'vitest';
import {
  createMockPrefixesConfig,
  createMockVariantsConfig,
} from '../fixtures';
import { variantsToCssRules } from './variantsToCss';

describe('joinNestedKeys', () => {
  test('passing deep object', () => {
    const MOCK_VARIANTS = createMockVariantsConfig();
    const MOCK_PREFIXES = createMockPrefixesConfig();

    const cssRules = variantsToCssRules(MOCK_VARIANTS, {
      prefixes: MOCK_PREFIXES,
    });
    for (const rule of cssRules) {
      console.log(`${rule[0]}: \n${JSON.stringify(rule[1], undefined, 2)}\n`);
    }
  });
});
