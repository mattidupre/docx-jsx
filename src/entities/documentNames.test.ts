import { expect, test } from 'vitest';
import { createTypographyVars } from './documentNames';
import { assignPrefixesOptions } from './options';
import { TYPOGRAPHY_CSS_KEYS } from './typography';

test('declares one typography variable per css key, in key order', () => {
  // Variables are written in schema order, so the schema has to follow the
  // key list the rest of the library iterates.
  expect(
    createTypographyVars({ prefixes: assignPrefixesOptions() }).cssVarKeys,
  ).toEqual(TYPOGRAPHY_CSS_KEYS);
});
