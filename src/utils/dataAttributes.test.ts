import { describe, expect, test } from 'vitest';
import {
  decodeDataAttributeValue,
  encodeDataAttributeValue,
} from './dataAttributes';

describe('encodeDataAttributeValue', () => {
  const SUBJECTS = [
    ['plain', 'plain'],
    [12, '12'],
    [true, 'true'],
    [{ a: 1 }, '%7B%22a%22:1%7D'],
  ] as const;

  for (const [value, expected] of SUBJECTS) {
    test(`${JSON.stringify(value)} == ${expected}`, () => {
      expect(encodeDataAttributeValue(value)).toBe(expected);
    });
  }
});

describe('decodeDataAttributeValue', () => {
  const SUBJECTS = [
    'htmltag',
    { size: { width: '5in' } },
    { fontFamily: 'Times New Roman, serif' },
    ['--brand', '#00dddd'],
    12,
    true,
  ] as const;

  for (const value of SUBJECTS) {
    test(`round trips ${JSON.stringify(value)}`, () => {
      expect(decodeDataAttributeValue(encodeDataAttributeValue(value))).toEqual(
        value,
      );
    });
  }
});
