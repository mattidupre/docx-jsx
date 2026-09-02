import { describe, expect, test } from 'vitest';
import {
  encodeDataAttributeKey,
  encodeDataAttributeValue,
  encodeDataAttributes,
  decodeDataAttributes,
} from './dataAttributes';

const OPTIONS = { prefix: 'matti-docs' } as const;

describe('encodeDataAttributeKey', () => {
  const SUBJECTS = [
    ['elementType', 'data-matti-docs-element-type'],
    ['elementOptions', 'data-matti-docs-element-options'],
    ['variant', 'data-matti-docs-variant'],
  ] as const;

  for (const [key, expected] of SUBJECTS) {
    test(`${key} == ${expected}`, () => {
      expect(encodeDataAttributeKey(key, OPTIONS)).toBe(expected);
    });
  }

  test('separates the prefix from the key', () => {
    // Without the separator this collapsed to data-matti-docselement-type,
    // which cannot be split back into a prefix and a key.
    expect(encodeDataAttributeKey('elementType', OPTIONS)).not.toBe(
      'data-matti-docselement-type',
    );
  });

  test('falls back to a bare data- prefix', () => {
    expect(encodeDataAttributeKey('elementType')).toBe('data-element-type');
  });

  test('rejects keys that are not camel case', () => {
    expect(() => encodeDataAttributeKey('element-type', OPTIONS)).toThrow();
    expect(() => encodeDataAttributeKey('ElementType', OPTIONS)).toThrow();
  });
});

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

describe('encodeDataAttributes / decodeDataAttributes', () => {
  const SUBJECTS = [
    { elementType: 'htmltag' },
    { elementType: 'document', elementOptions: { size: { width: '5in' } } },
    { elementType: 'split', variant: 'heading1' },
    { contentOptions: { fontFamily: 'Times New Roman, serif' } },
  ] as const;

  for (const data of SUBJECTS) {
    test(`round trips ${JSON.stringify(data)}`, () => {
      const attributes = encodeDataAttributes({ ...data }, OPTIONS);
      expect(decodeDataAttributes(attributes, OPTIONS)).toEqual(data);
    });
  }

  test('encodes every key with the prefixed, separated name', () => {
    expect(
      Object.keys(
        encodeDataAttributes(
          { elementType: 'split', elementOptions: {} },
          OPTIONS,
        ),
      ),
    ).toEqual([
      'data-matti-docs-element-type',
      'data-matti-docs-element-options',
    ]);
  });

  test('decodes the camel cased property names HAST produces', () => {
    expect(
      decodeDataAttributes(
        {
          dataMattiDocsElementType: 'document',
          dataMattiDocsElementOptions: encodeDataAttributeValue({ a: 1 }),
        },
        OPTIONS,
      ),
    ).toEqual({ elementType: 'document', elementOptions: { a: 1 } });
  });

  test('ignores data attributes belonging to anything else', () => {
    expect(
      decodeDataAttributes(
        {
          dataStackIndex: '2',
          'data-is-stack-continuous': '',
          // Shares the prefix but not the separator.
          dataMattiDocsuffix: 'not mine',
          dataMattiDocsElementType: 'stack',
        },
        OPTIONS,
      ),
    ).toEqual({ elementType: 'stack' });
  });

  test('ignores non-string values', () => {
    expect(
      decodeDataAttributes({ dataMattiDocsElementType: 12 }, OPTIONS),
    ).toEqual({});
  });
});
