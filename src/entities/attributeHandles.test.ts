import { describe, expect, test } from 'vitest';
import { defineAttributes, defineClassNames } from './attributeHandles';

const SCHEMA = {
  fontSize: { attributeTypes: ['css-var'] },
  elementType: { attributeTypes: ['data-attribute'] },
  isActive: { attributeTypes: ['data-attribute'] },
  both: { attributeTypes: ['css-var', 'data-attribute'] },
} as const;

describe('defineAttributes', () => {
  const attrs = defineAttributes('matti-docs', SCHEMA);

  test('names css variables and data attributes under the prefix', () => {
    expect(attrs.cssVarKeys).toEqual(['fontSize', 'both']);
    expect(attrs.cssVarKeys.map(attrs.var)).toEqual([
      '--matti-docs-font-size',
      '--matti-docs-both',
    ]);
    expect(attrs.dataAttributeKeys).toEqual([
      'elementType',
      'isActive',
      'both',
    ]);
    expect(attrs.dataAttributeKeys.map(attrs.dataAttribute)).toEqual([
      'data-matti-docs-element-type',
      'data-matti-docs-is-active',
      'data-matti-docs-both',
    ]);
  });

  test('keeps the prefix as written and separates it from the key', () => {
    // A prefix is not kebab cased: the names the stylesheet reads and the
    // names an element is given have to be the same string.
    expect(defineAttributes('my_docs', SCHEMA).var('fontSize')).toBe(
      '--my_docs-font-size',
    );
    expect(attrs.dataAttribute('elementType')).not.toBe(
      'data-matti-docselement-type',
    );
  });

  test('names bare keys without a prefix', () => {
    expect(defineAttributes(undefined, SCHEMA).var('fontSize')).toBe(
      '--font-size',
    );
  });

  test('references a variable with and without a fallback', () => {
    expect(attrs.ref('fontSize')).toBe('var(--matti-docs-font-size)');
    expect(attrs.ref('fontSize', '16px')).toBe(
      'var(--matti-docs-font-size, 16px)',
    );
    expect(attrs.ref('fontSize', 0)).toBe('var(--matti-docs-font-size, 0)');
  });

  test('refuses a key of the other attribute type at runtime', () => {
    // @ts-expect-error `elementType` is a data attribute only.
    expect(() => attrs.var('elementType')).toThrow(TypeError);
    // @ts-expect-error `fontSize` is a css variable only.
    expect(() => attrs.dataAttribute('fontSize')).toThrow(TypeError);
  });

  test('encodes css variables in schema order, skipping undefined and false', () => {
    expect(attrs.encodeCssVars({ both: 'a', fontSize: 12 })).toEqual({
      '--matti-docs-font-size': '12',
      '--matti-docs-both': 'a',
    });
    expect(
      Object.keys(attrs.encodeCssVars({ both: 'a', fontSize: 1 })),
    ).toEqual(['--matti-docs-font-size', '--matti-docs-both']);
    expect(attrs.encodeCssVars({ fontSize: undefined, both: false })).toEqual(
      {},
    );
  });

  test('encodes data attributes, writing true as an empty attribute', () => {
    expect(
      attrs.encodeDataAttributes({
        elementType: 'split',
        isActive: true,
        both: false,
      }),
    ).toEqual({
      'data-matti-docs-element-type': 'split',
      'data-matti-docs-is-active': '',
    });
  });

  test('decodes attribute names and the camel cased names HAST produces', () => {
    expect(
      attrs.decodeDataAttributes({
        'data-matti-docs-element-type': 'document',
        dataMattiDocsIsActive: '',
      }),
    ).toEqual({ elementType: 'document', isActive: '' });
  });

  test('ignores data attributes belonging to anything else', () => {
    expect(
      attrs.decodeDataAttributes({
        dataStackIndex: '2',
        'data-is-stack-continuous': '',
        // Shares the prefix but not the separator.
        dataMattiDocsuffix: 'not mine',
        dataMattiDocsElementType: 'stack',
      }),
    ).toEqual({ elementType: 'stack' });
  });

  test('ignores non-string values', () => {
    expect(
      attrs.decodeDataAttributes({ dataMattiDocsElementType: 12 }),
    ).toEqual({});
  });

  test('selects by data attributes, quoting every value', () => {
    expect(attrs.selector({ elementType: 'break', isActive: true })).toBe(
      '[data-matti-docs-element-type="break"][data-matti-docs-is-active=""]',
    );
    expect(attrs.selector({ elementType: 'a"b' })).toBe(
      '[data-matti-docs-element-type="a\\"b"]',
    );
  });
});

describe('defineClassNames', () => {
  const classNames = defineClassNames<'gridItem' | 'heading1'>('matti-docs');

  test('names and selects classes under the prefix', () => {
    expect(classNames.name('gridItem')).toBe('matti-docs-grid-item');
    expect(classNames.name('heading1')).toBe('matti-docs-heading-1');
    expect(classNames.selector('gridItem')).toBe('.matti-docs-grid-item');
  });
});
