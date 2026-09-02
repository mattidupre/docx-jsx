import { describe, expect, it } from 'vitest';
import type { ListContext } from '../../entities';
import {
  MAX_LIST_LEVEL,
  createListNumbering,
  listNumberingLevels,
  listNumberingReference,
} from './numberingToDocx';

const createList = (list: Partial<ListContext> = {}): ListContext => ({
  level: 0,
  instance: 0,
  format: 'decimal',
  start: 1,
  indent: undefined,
  ...list,
});

describe('listNumberingReference', () => {
  it('names one abstract numbering per marker, start and indent', () => {
    expect(listNumberingReference(createList())).toBe(
      listNumberingReference(createList({ level: 4, instance: 9 })),
    );
    expect(listNumberingReference(createList({ start: 3 }))).not.toBe(
      listNumberingReference(createList()),
    );
    expect(listNumberingReference(createList({ format: 'bullet' }))).not.toBe(
      listNumberingReference(createList()),
    );
    expect(listNumberingReference(createList({ indent: '0.25in' }))).not.toBe(
      listNumberingReference(createList()),
    );
  });

  it('holds nothing a regular expression would read as a pattern', () => {
    // `docx` writes the reference into `w:numId` and replaces it later with
    // `new RegExp(reference)`, so a `.` or a `(` would match the wrong text.
    expect(listNumberingReference(createList({ indent: '1.5cm' }))).toMatch(
      /^[0-9A-Za-z-]+$/,
    );
  });
});

describe('listNumberingLevels', () => {
  it('declares every level Word can number', () => {
    expect(
      listNumberingLevels(createList()).map(({ level }) => level),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(MAX_LIST_LEVEL).toBe(8);
  });

  it('cycles the bullet characters a browser draws for nested lists', () => {
    expect(
      listNumberingLevels(createList({ format: 'bullet' }))
        .slice(0, 4)
        .map(({ text }) => text),
    ).toEqual(['●', '○', '■', '●']);
  });
});

describe('createListNumbering', () => {
  it('declares only the numberings the document asked for', () => {
    const numbering = createListNumbering();
    expect(numbering.toNumberingOptions().config).toEqual([]);

    const decimal = numbering.useList(createList());
    const alsoDecimal = numbering.useList(createList({ instance: 1 }));
    const roman = numbering.useList(
      createList({ format: 'lowerRoman', start: 3 }),
    );

    expect(alsoDecimal).toBe(decimal);
    expect(roman).not.toBe(decimal);
    expect(
      numbering.toNumberingOptions().config.map(({ reference }) => reference),
    ).toEqual([decimal, roman]);
  });
});
