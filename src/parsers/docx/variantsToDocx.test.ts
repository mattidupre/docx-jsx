import { Document, Packer, Paragraph, TextRun } from 'docx';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { describe, expect, test } from 'vitest';
import {
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS,
  INTRINSIC_VARIANT_TAG_NAMES,
  MONOSPACE_DOCX_FONT_NAME,
  MONOSPACE_FONT_FAMILY,
  type FontsConfig,
  type Variants,
} from '../../entities';
import {
  parseVariants,
  variantNameToCharacterStyleId,
  variantNameToParagraphStyleId,
} from './variantsToDocx';

const NO_FONTS: FontsConfig = {};

const MOCK_VARIANTS: Variants = {
  heading1: {
    color: '#ff00ff',
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  hyperlink: {
    color: '#ff00ff',
  },
  mockParagraphVariant: {
    fontSize: '1.25rem',
    marginBottom: '1rem',
  },
  mockTextVariant: {
    fontSize: '1.25rem',
  },
  'Job Title': {
    fontWeight: 'bold',
  },
};

type Subject<TResult> = [string | undefined, TResult];

const subjectToString = ([variantName, result]: Subject<unknown>) =>
  `(${JSON.stringify(variantName)}) == ${JSON.stringify(result)}`;

describe('variantNameToParagraphStyleId', () => {
  const SUBJECTS: ReadonlyArray<Subject<undefined | string>> = [
    // Word only recognizes its own heading style ids in the navigation pane,
    // the outline view and generated tables of contents.
    ['heading1', 'Heading1'],
    ['heading2', 'Heading2'],
    ['heading3', 'Heading3'],
    ['heading4', 'Heading4'],
    ['heading5', 'Heading5'],
    ['heading6', 'Heading6'],
    ['listParagraph', 'ListParagraph'],
    // `hyperlink` is a character style in Word: it has no paragraph style.
    ['hyperlink', undefined],
    // A name that is already a single alphanumeric token is used verbatim.
    ['mockParagraphVariant', 'mockParagraphVariant'],
    ['heading7', 'heading7'],
    // Anything else is escaped as X plus the four hex digit code unit.
    ['Job Title', 'JobX0020Title'],
    ['my-variant', 'myX002Dvariant'],
    ['my_variant', 'myX005Fvariant'],
    ['my variant', 'myX0020variant'],
    // A literal X is doubled so the escape stays reversible.
    ['aXb', 'aXXb'],
    ['a X b', 'aX0020XXX0020b'],
    ['épée', 'X00E9pX00E9e'],
    [undefined, undefined],
    ['', undefined],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(variantNameToParagraphStyleId(subject[0])).toBe(subject[1]);
    });
  }

  test('never produces an id with a space or punctuation', () => {
    for (const variantName of Object.keys(MOCK_VARIANTS)) {
      const styleId = variantNameToParagraphStyleId(variantName);
      if (styleId !== undefined) {
        expect(styleId).toMatch(/^[0-9A-Za-z]+$/);
      }
    }
  });

  test('maps names that differ only in punctuation to different ids', () => {
    const variantNames = [
      'my variant',
      'myVariant',
      'my-variant',
      'my_variant',
      'My Variant',
      'myXvariant',
      'myX0020variant',
    ];
    const styleIds = variantNames.map((variantName) =>
      variantNameToParagraphStyleId(variantName),
    );
    expect(new Set(styleIds).size).toBe(variantNames.length);
  });

  test('does not depend on the other variants in the document', () => {
    expect(variantNameToParagraphStyleId('Job Title')).toBe(
      variantNameToParagraphStyleId('Job Title'),
    );
  });
});

describe('variantNameToCharacterStyleId', () => {
  const SUBJECTS: ReadonlyArray<Subject<undefined | string>> = [
    // Word's own linked character style naming for a paragraph style.
    ['heading1', 'Heading1Char'],
    ['heading6', 'Heading6Char'],
    ['listParagraph', 'ListParagraphChar'],
    // `hyperlink` is a character style already.
    ['hyperlink', 'Hyperlink'],
    ['mockTextVariant', 'mockTextVariantChar'],
    ['Job Title', 'JobX0020TitleChar'],
    [undefined, undefined],
    ['', undefined],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(variantNameToCharacterStyleId(subject[0])).toBe(subject[1]);
    });
  }
});

describe('parseVariants', () => {
  test('registers every intrinsic paragraph variant as a docx default', () => {
    const { default: defaultStyles } = parseVariants(NO_FONTS, {});
    expect(Object.keys(defaultStyles ?? {}).sort()).toEqual([
      'heading1',
      'heading2',
      'heading3',
      'heading4',
      'heading5',
      'heading6',
      'hyperlink',
      'listParagraph',
    ]);
  });

  test('links each intrinsic paragraph default to its character style', () => {
    const { default: defaultStyles, characterStyles } = parseVariants(
      NO_FONTS,
      MOCK_VARIANTS,
    );
    expect(defaultStyles?.heading1).toEqual({
      link: 'Heading1Char',
      // The intrinsic h1 margin, which the variant does not override.
      paragraph: {
        spacing: { before: 322, after: 322 },
        keepNext: true,
        keepLines: true,
      },
      run: { bold: true, color: 'ff00ff', size: 48 },
    });
    expect(characterStyles?.find(({ id }) => id === 'Heading1Char')).toEqual({
      id: 'Heading1Char',
      name: 'Heading 1 Char',
      link: 'Heading1',
      quickFormat: true,
      run: { bold: true, color: 'ff00ff', size: 48 },
    });
  });

  test('registers an intrinsic character variant without a paragraph style', () => {
    const { default: defaultStyles, paragraphStyles } = parseVariants(
      NO_FONTS,
      MOCK_VARIANTS,
    );
    expect(defaultStyles?.hyperlink).toEqual({ run: { color: 'ff00ff' } });
    expect(paragraphStyles?.map(({ id }) => id)).not.toContain('hyperlink');
    expect(paragraphStyles?.map(({ id }) => id)).not.toContain('Hyperlink');
  });

  test('registers a custom variant as a linked paragraph and character pair', () => {
    const { paragraphStyles, characterStyles } = parseVariants(
      NO_FONTS,
      MOCK_VARIANTS,
    );
    expect(
      paragraphStyles?.find(({ id }) => id === 'mockParagraphVariant'),
    ).toEqual({
      id: 'mockParagraphVariant',
      name: 'Mock Paragraph Variant',
      link: 'mockParagraphVariantChar',
      quickFormat: true,
      paragraph: { spacing: { after: 240 } },
      run: { size: 30 },
    });
    expect(
      characterStyles?.find(({ id }) => id === 'mockParagraphVariantChar'),
    ).toEqual({
      id: 'mockParagraphVariantChar',
      name: 'Mock Paragraph Variant Char',
      link: 'mockParagraphVariant',
      quickFormat: true,
      run: { size: 30 },
    });
  });

  test('keeps the human readable name on a style with an escaped id', () => {
    const { paragraphStyles } = parseVariants(NO_FONTS, MOCK_VARIANTS);
    expect(paragraphStyles?.find(({ id }) => id === 'JobX0020Title')).toEqual({
      id: 'JobX0020Title',
      name: 'Job Title',
      link: 'JobX0020TitleChar',
      quickFormat: true,
      paragraph: {},
      run: { bold: true },
    });
  });

  test('emits no style id containing a space or punctuation', () => {
    const { paragraphStyles, characterStyles } = parseVariants(
      NO_FONTS,
      MOCK_VARIANTS,
    );
    for (const { id } of [...paragraphStyles!, ...characterStyles!]) {
      expect(id).toMatch(/^[0-9A-Za-z]+$/);
    }
  });

  test('emits unique style ids', () => {
    const { paragraphStyles, characterStyles } = parseVariants(
      NO_FONTS,
      MOCK_VARIANTS,
    );
    const ids = [...paragraphStyles!, ...characterStyles!].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('throws rather than emitting two styles with the same id', () => {
    expect(() =>
      parseVariants(NO_FONTS, { foo: {}, fooChar: {} }),
    ).toThrowError(
      'Variants "foo" and "fooChar" both map to style id "fooChar".',
    );
  });

  test('throws rather than emitting a style with no id', () => {
    expect(() => parseVariants(NO_FONTS, { '': {} })).toThrowError(
      'Variant names cannot be empty.',
    );
  });
});

/**
 * The heading scale of `INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS`, resolved into
 * the OOXML units Word reads: `w:sz` in half-points and `w:spacing` in twips.
 *
 * | tag | font size | w:sz | margin   | twips |
 * | h1  | 32px/24pt | 48   | 21.44px  | 322   |
 * | h2  | 24px/18pt | 36   | 19.92px  | 299   |
 * | h3  | 18.72px   | 28   | 18.72px  | 281   |
 * | h4  | 16px/12pt | 24   | 21.28px  | 319   |
 * | h5  | 13.28px   | 20   | 22.18px  | 333   |
 * | h6  | 10.72px   | 16   | 24.98px  | 375   |
 */
const HEADING_SCALE_SUBJECTS = [
  ['heading1', 48, 322],
  ['heading2', 36, 299],
  ['heading3', 28, 281],
  ['heading4', 24, 319],
  ['heading5', 20, 333],
  ['heading6', 16, 375],
] as const satisfies ReadonlyArray<readonly [string, number, number]>;

describe('parseVariants heading scale', () => {
  for (const [variantName, size, margin] of HEADING_SCALE_SUBJECTS) {
    test(`${variantName} is bold at w:sz ${size} with ${margin} twips of spacing`, () => {
      const { default: defaultStyles, characterStyles } = parseVariants(
        NO_FONTS,
        {},
      );

      expect(defaultStyles?.[variantName]).toEqual({
        link: `${variantNameToParagraphStyleId(variantName)}Char`,
        paragraph: {
          spacing: { before: margin, after: margin },
          keepNext: true,
          keepLines: true,
        },
        run: { bold: true, size },
      });

      // The linked character style carries the same run properties, so the
      // variant means the same thing on an inline tag as on a block one.
      expect(
        characterStyles?.find(
          ({ id }) => id === variantNameToCharacterStyleId(variantName),
        )?.run,
      ).toEqual({ bold: true, size });
    });
  }

  test('a user variant overrides the intrinsic value it redeclares', () => {
    const { default: defaultStyles } = parseVariants(NO_FONTS, {
      heading2: { fontSize: '3rem', fontWeight: 'normal' },
    });

    expect(defaultStyles?.heading2).toEqual({
      link: 'Heading2Char',
      // Untouched by the variant, so still the intrinsic h2 margin and keeps.
      paragraph: {
        spacing: { before: 299, after: 299 },
        keepNext: true,
        keepLines: true,
      },
      run: { bold: false, size: 72 },
    });
  });

  /**
   * A heading's scale is registered as a Word style because `Heading1`..
   * `Heading6` are what a plain `<h1>`..`<h6>` resolves to. `blockquote`, `pre`
   * and `code` resolve to no built-in style, so their intrinsic typography is
   * written as direct paragraph and run properties by `htmlToDocx` and must
   * not leak into the style table -- a style carrying the 600 twip quote inset
   * would indent every paragraph an author applied a variant to.
   */
  describe('the intrinsic typography of blockquote, pre and code', () => {
    const styleTable = (variants: Variants) => {
      const {
        default: defaultStyles,
        paragraphStyles,
        characterStyles,
      } = parseVariants(NO_FONTS, variants);
      return JSON.stringify({
        defaultStyles,
        paragraphStyles,
        characterStyles,
      });
    };

    test('names no variant after one of these tags', () => {
      for (const tagName of Object.keys(INTRINSIC_TAG_TYPOGRAPHY_OPTIONS)) {
        expect(Object.values(INTRINSIC_VARIANT_TAG_NAMES)).not.toContain(
          tagName,
        );
      }
    });

    test('registers no style carrying the quote inset or a monospace font', () => {
      const styles = styleTable(MOCK_VARIANTS);
      // 40px == 600 twips, the inset `htmlToDocx` writes onto a quoted
      // paragraph directly.
      expect(styles).not.toContain('600');
      expect(styles).not.toContain(MONOSPACE_FONT_FAMILY);
      expect(styles).not.toContain(MONOSPACE_DOCX_FONT_NAME);
    });

    test('still lets an author declare a variant with the same formatting', () => {
      const { paragraphStyles } = parseVariants(NO_FONTS, {
        quote: {
          marginLeft: INTRINSIC_TAG_TYPOGRAPHY_OPTIONS.blockquote.marginLeft,
          marginRight: INTRINSIC_TAG_TYPOGRAPHY_OPTIONS.blockquote.marginRight,
        },
      });
      expect(
        paragraphStyles?.find(({ id }) => id === 'quote')?.paragraph,
      ).toEqual({ indent: { left: 600, right: 600 } });
    });
  });

  test('leaves a variant with no intrinsic tag alone', () => {
    const { default: defaultStyles, paragraphStyles } = parseVariants(
      NO_FONTS,
      { mockParagraphVariant: { fontSize: '1.25rem' } },
    );

    expect(defaultStyles?.listParagraph).toEqual({
      link: 'ListParagraphChar',
      paragraph: {},
      run: {},
    });
    expect(
      paragraphStyles?.find(({ id }) => id === 'mockParagraphVariant'),
    ).toMatchObject({ paragraph: {}, run: { size: 30 } });
  });
});

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const packDocument = async (document: Document) => {
  const zip = await JSZip.loadAsync(await Packer.toBuffer(document));
  const readEntry = async (path: string) => {
    const file = zip.file(path);
    if (!file) {
      throw new Error(`Missing ${path} in the packed document.`);
    }
    return file.async('string');
  };
  return {
    stylesXml: await readEntry('word/styles.xml'),
    documentXml: await readEntry('word/document.xml'),
  };
};

const createDocument = (variants: Variants) =>
  new Document({
    styles: parseVariants(NO_FONTS, variants),
    sections: [
      {
        children: [
          new Paragraph({
            style: variantNameToParagraphStyleId('heading1'),
            children: [
              new TextRun({
                text: 'Heading',
                style: variantNameToCharacterStyleId('heading1'),
              }),
            ],
          }),
          new Paragraph({
            style: variantNameToParagraphStyleId('mockParagraphVariant'),
            children: [
              new TextRun({
                text: 'Body',
                style: variantNameToCharacterStyleId('mockTextVariant'),
              }),
              new TextRun({
                text: 'Job',
                style: variantNameToCharacterStyleId('Job Title'),
              }),
            ],
          }),
        ],
      },
    ],
  });

describe('parseVariants packed into a docx', () => {
  const readStyles = (stylesXml: string) => {
    const styles = XML_PARSER.parse(stylesXml)['w:styles']['w:style'] as
      | ReadonlyArray<Record<string, string>>
      | Record<string, string>;
    return (Array.isArray(styles) ? styles : [styles]).map((style) => ({
      id: style['@_w:styleId'],
      type: style['@_w:type'],
    }));
  };

  test('every style id in word/document.xml resolves in word/styles.xml', async () => {
    const { stylesXml, documentXml } = await packDocument(
      createDocument(MOCK_VARIANTS),
    );
    const declaredIds = new Set(readStyles(stylesXml).map(({ id }) => id));
    const referencedIds = [
      ...documentXml.matchAll(/<w:(?:pStyle|rStyle) w:val="([^"]+)"/g),
    ].map(([, id]) => id);

    expect(referencedIds).toEqual([
      'Heading1',
      'Heading1Char',
      'mockParagraphVariant',
      'mockTextVariantChar',
      'JobX0020TitleChar',
    ]);
    for (const referencedId of referencedIds) {
      expect(declaredIds).toContain(referencedId);
    }
  });

  test('declares heading variants as Word paragraph styles', async () => {
    const { stylesXml } = await packDocument(createDocument(MOCK_VARIANTS));
    const styles = readStyles(stylesXml);
    expect(styles).toContainEqual({ id: 'Heading1', type: 'paragraph' });
    expect(styles).toContainEqual({ id: 'Heading1Char', type: 'character' });
    expect(styles).toContainEqual({
      id: 'mockParagraphVariant',
      type: 'paragraph',
    });
    expect(styles).toContainEqual({
      id: 'mockTextVariantChar',
      type: 'character',
    });
  });

  test('declares no duplicate or unsafe style ids', async () => {
    const { stylesXml } = await packDocument(createDocument(MOCK_VARIANTS));
    const ids = readStyles(stylesXml).map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-Za-z]+$/);
    }
  });

  test('applies the heading1 variant to the built-in Heading1 style', async () => {
    const { stylesXml } = await packDocument(createDocument(MOCK_VARIANTS));
    const heading1 = (
      XML_PARSER.parse(stylesXml)['w:styles']['w:style'] as ReadonlyArray<any>
    ).find((style) => style['@_w:styleId'] === 'Heading1');
    expect(heading1['w:rPr']['w:color']['@_w:val']).toBe('ff00ff');
    expect(heading1['w:rPr']['w:sz']['@_w:val']).toBe('48');
  });
});
