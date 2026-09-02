import { describe, expect, test } from 'vitest';
import {
  type ElementData,
  decodeElementData,
  encodeElementData,
} from './elements';

const SUBJECTS = [
  {
    elementType: 'split',
    elementOptions: {},
    contentOptions: {},
    variant: undefined,
  },
  {
    elementType: 'header',
    elementOptions: { layoutType: 'first' },
    contentOptions: { fontWeight: 'bold' },
    variant: 'heading1',
  },
  {
    elementType: 'gridItem',
    elementOptions: { size: 6 },
    contentOptions: { fontFamily: 'Times New Roman, serif' },
    variant: undefined,
  },
] as const satisfies ReadonlyArray<ElementData>;

describe('encodeElementData', () => {
  test('names every attribute with a separated, constant prefix', () => {
    expect(
      Object.keys(
        encodeElementData({
          elementType: 'header',
          elementOptions: { layoutType: 'first' },
          contentOptions: { fontWeight: 'bold' },
          variant: 'heading1',
        }),
      ),
    ).toEqual([
      'data-matti-docs-element-type',
      'data-matti-docs-element-options',
      'data-matti-docs-content-options',
      'data-matti-docs-variant',
    ]);
  });
});

describe('decodeElementData', () => {
  for (const elementData of SUBJECTS) {
    test(`round trips ${elementData.elementType}`, () => {
      const properties = encodeElementData(elementData);
      expect(decodeElementData({ properties })).toEqual(elementData);
    });
  }

  test('round trips the camel cased property names HAST produces', () => {
    const elementData = SUBJECTS[1];
    const properties = Object.fromEntries(
      Object.entries(encodeElementData(elementData)).map(([key, value]) => [
        key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
      ]),
    );

    expect(decodeElementData({ properties })).toEqual(elementData);
  });

  test('defaults an unannotated element to an html tag', () => {
    expect(
      decodeElementData({ properties: { className: 'unrelated' } }),
    ).toEqual({
      elementType: 'htmltag',
      elementOptions: {},
      contentOptions: {},
      variant: undefined,
    });
  });

  test('rejects a partially annotated element', () => {
    expect(() =>
      decodeElementData({
        properties: { 'data-matti-docs-element-type': 'split' },
      }),
    ).toThrow();
  });
});
