import {
  AlignmentType,
  BorderStyle,
  LineRuleType,
  type IParagraphPropertiesOptions,
  type IRunPropertiesOptions,
} from 'docx';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from 'vitest';
import {
  INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS,
  INTRINSIC_TYPOGRAPHY_OPTIONS,
  MONOSPACE_FONT_FAMILY,
  type FontsConfig,
  type TagName,
  type TypographyOptions,
  type UnitsSize,
  resolveLineBox,
} from '../../entities';
import { getValueOf } from '../../utils/object';
import {
  parseLineSpacing,
  parseParagraphOptions,
  parseTextRunOptions,
} from './typographyOptionsToDocx';

const NO_FONTS: FontsConfig = {};

type Subject<TResult> = [TypographyOptions, TResult];

type Subjects<TResult> = ReadonlyArray<Subject<TResult>>;

const subjectToString = ([options, result]: Subject<unknown>) =>
  `(${JSON.stringify(options)}) == ${JSON.stringify(result)}`;

let warn: MockInstance;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseTextRunOptions', () => {
  const SUBJECTS: Subjects<IRunPropertiesOptions> = [
    [{}, {}],
    // Alignment is a paragraph property in OOXML; a run must never carry it.
    [{ textAlign: 'center' }, {}],
    [{ textAlign: 'justify' }, {}],
    // `font-size: normal` has no Word equivalent, so the run inherits.
    [{ fontSize: 'normal' }, {}],
    // w:sz is in half points: 2rem == 24pt == 48 half points.
    [{ fontSize: '2rem' }, { size: 48 }],
    [{ fontSize: '1rem' }, { size: 24 }],
    [{ fontSize: '11pt' }, { size: 22 }],
    [{ fontSize: '16px' }, { size: 24 }],
    // Half points are integers, so 10.5pt rounds rather than emitting 21.0.
    [{ fontSize: '10.5pt' }, { size: 21 }],
    [{ color: '#ff00ff' }, { color: 'ff00ff' }],
    // `currentColor` means "inherit", which is the absence of a color.
    [{ color: 'currentColor' }, {}],
    // A variable fallback list resolves to its last (literal) entry, exactly
    // as the CSS custom property would.
    [{ color: ['--mock-color', '#00dddd'] }, { color: '00dddd' }],
    [{ highlightColor: '#ffff00' }, { shading: { fill: 'ffff00' } }],
    [{ fontWeight: 'bold' }, { bold: true }],
    [{ fontWeight: 'normal' }, { bold: false }],
    [{ fontStyle: 'italic' }, { italics: true }],
    [{ fontStyle: 'normal' }, { italics: false }],
    [{ textTransform: 'uppercase' }, { allCaps: true }],
    [{ textTransform: 'none' }, { allCaps: false }],
    [{ textDecoration: 'underline' }, { underline: {} }],
    [{ textDecoration: 'line-through' }, { strike: true }],
    [{ textDecoration: 'none' }, {}],
    [{ superScript: true }, { superScript: true }],
    [{ subScript: true }, { subScript: true }],
    // Paragraph-only options never leak into the run properties.
    [
      {
        lineHeight: '1.2',
        marginTop: '1rem',
        marginBottom: '1rem',
        marginLeft: '1rem',
        marginRight: '1rem',
        textIndent: '1rem',
        borderBottomWidth: '1px',
      },
      {},
    ],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(parseTextRunOptions(NO_FONTS, subject[0])).toEqual(subject[1]);
    });
  }

  test('with undefined', () => {
    expect(parseTextRunOptions(NO_FONTS, undefined)).toEqual({});
  });

  test('never emits an alignment key', () => {
    expect(
      Object.keys(
        parseTextRunOptions(NO_FONTS, {
          textAlign: 'right',
          fontWeight: 'bold',
        }) ?? {},
      ),
    ).toEqual(['bold']);
  });
});

describe('parseParagraphOptions', () => {
  const SUBJECTS: Subjects<IParagraphPropertiesOptions> = [
    // Empty spacing / indent / border objects are omitted entirely: shipping
    // them makes Word treat unset properties as explicit overrides.
    [{}, {}],
    [{ fontSize: '2rem' }, {}],
    [{ textAlign: 'left' }, { alignment: AlignmentType.LEFT }],
    [{ textAlign: 'center' }, { alignment: AlignmentType.CENTER }],
    [{ textAlign: 'right' }, { alignment: AlignmentType.RIGHT }],
    [{ textAlign: 'justify' }, { alignment: AlignmentType.JUSTIFIED }],
    [{ highlightColor: '#ffff00' }, { shading: { fill: 'ffff00' } }],

    // The line height needs the resolved font size and font, so it is the
    // line box's (`parseLineSpacing`), never a paragraph option's.
    [{ lineHeight: '1.2' }, {}],
    [{ lineHeight: '18px' }, {}],
    [{ lineHeight: 'normal' }, {}],
    [{ marginTop: '1rem' }, { spacing: { before: 240 } }],
    [{ marginBottom: '0.5rem' }, { spacing: { after: 120 } }],
    [
      { marginTop: '1rem', marginBottom: '1rem', lineHeight: '1.2' },
      { spacing: { before: 240, after: 240 } },
    ],
    // Twips are integers in OOXML.
    [{ marginTop: '1cm' }, { spacing: { before: 567 } }],

    [{ textIndent: '1rem' }, { indent: { firstLine: 240 } }],
    [{ marginLeft: '2rem' }, { indent: { left: 480 } }],
    [{ marginRight: '0.25rem' }, { indent: { right: 60 } }],
    [
      { textIndent: '1rem', marginLeft: '1rem', marginRight: '1rem' },
      { indent: { firstLine: 240, left: 240, right: 240 } },
    ],

    // w:sz is in eighths of a point: 0.25rem == 3pt == 24 eighths.
    // w:space is in whole points.
    [
      {
        borderBottomWidth: '0.25rem',
        borderBottomColor: '#ffff00',
        paddingBottom: '0.25rem',
      },
      {
        border: {
          bottom: {
            color: 'ffff00',
            style: BorderStyle.SINGLE,
            space: 3,
            size: 24,
          },
        },
      },
    ],
    [
      { borderBottomWidth: '1px' },
      { border: { bottom: { style: BorderStyle.SINGLE, size: 6 } } },
    ],
    // Padding without a border width produces no border at all.
    [{ paddingBottom: '0.25rem' }, {}],
    [{ borderBottomColor: '#ffff00' }, {}],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      expect(parseParagraphOptions(NO_FONTS, subject[0])).toEqual(subject[1]);
      expect(warn).not.toHaveBeenCalled();
    });
  }

  test('with undefined', () => {
    expect(parseParagraphOptions(NO_FONTS, undefined)).toEqual({});
  });
});

describe('parseLineSpacing', () => {
  const NO_FONT = { fontFamily: undefined, metrics: undefined };

  const SUBJECTS: Subjects<ReturnType<typeof parseLineSpacing>> = [
    // A multiplier scales the resolved font size (CSS's 16px unless set) and
    // is written as the exact line it comes to, not as Word's `auto`, which
    // would multiply the font's own single line instead.
    [{ lineHeight: '1.2' }, { line: 288, lineRule: LineRuleType.EXACT }],
    [{ lineHeight: '1' }, { line: 240, lineRule: LineRuleType.EXACT }],
    [
      { lineHeight: '1.5', fontSize: '20pt' },
      { line: 600, lineRule: LineRuleType.EXACT },
    ],
    // A length is the line, in twips.
    [{ lineHeight: '1.5rem' }, { line: 360, lineRule: LineRuleType.EXACT }],
    [{ lineHeight: '18px' }, { line: 270, lineRule: LineRuleType.EXACT }],
    [{ lineHeight: '12pt' }, { line: 240, lineRule: LineRuleType.EXACT }],
    [{ lineHeight: '0.25in' }, { line: 360, lineRule: LineRuleType.EXACT }],
    [{ lineHeight: '1cm' }, { line: 567, lineRule: LineRuleType.EXACT }],
  ];

  for (const subject of SUBJECTS) {
    test(subjectToString(subject), () => {
      const lineBox = resolveLineBox(subject[0], NO_FONT);
      expect(lineBox && parseLineSpacing(lineBox, { atLeast: false })).toEqual(
        subject[1],
      );
    });
  }

  test('writes a paragraph holding a picture as at least the line', () => {
    const lineBox = resolveLineBox({ lineHeight: '18pt' }, NO_FONT);
    expect(lineBox && parseLineSpacing(lineBox, { atLeast: true })).toEqual({
      line: 360,
      lineRule: LineRuleType.AT_LEAST,
    });
  });
});

describe('parseParagraphOptions clamping', () => {
  // ECMA-376 CT_Border: w:sz is limited to 96 eighths of a point (12pt) and
  // w:space to 31 points.
  test('clamps a border wider than 12pt and warns once', () => {
    expect(
      parseParagraphOptions(NO_FONTS, { borderBottomWidth: '1in' }),
    ).toEqual({ border: { bottom: { style: BorderStyle.SINGLE, size: 96 } } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Expected borderBottomWidth to be at most 12pt, received 72pt.',
    );
  });

  test('clamps a negative border width and warns once', () => {
    expect(
      parseParagraphOptions(NO_FONTS, { borderBottomWidth: '-1pt' }),
    ).toEqual({ border: { bottom: { style: BorderStyle.SINGLE, size: 0 } } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Expected borderBottomWidth to be at least 0pt, received -1pt.',
    );
  });

  test('clamps border padding over 31pt and warns once', () => {
    expect(
      parseParagraphOptions(NO_FONTS, {
        borderBottomWidth: '1pt',
        paddingBottom: '1in',
      }),
    ).toEqual({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, space: 31 } },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Expected paddingBottom to be at most 31pt, received 72pt.',
    );
  });

  test('warns for both the width and the padding when both are out of range', () => {
    parseParagraphOptions(NO_FONTS, {
      borderBottomWidth: '1in',
      paddingBottom: '1in',
    });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  test('does not warn about padding when no border is emitted', () => {
    expect(parseParagraphOptions(NO_FONTS, { paddingBottom: '1in' })).toEqual(
      {},
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

/**
 * The one table both targets read the heading scale from. These assertions
 * pin the entity values to the OOXML units they have to produce, so a change
 * to the scale is a deliberate edit here rather than a silent drift between
 * `lib/styles.ts` and `word/styles.xml`.
 *
 * | tag | font size | w:sz | margin  | w:spacing |
 * | h1  | 32px      | 48   | 21.44px | 322       |
 * | h2  | 24px      | 36   | 19.92px | 299       |
 * | h3  | 18.72px   | 28   | 18.72px | 281       |
 * | h4  | 16px      | 24   | 21.28px | 319       |
 * | h5  | 13.28px   | 20   | 22.18px | 333       |
 * | h6  | 10.72px   | 16   | 24.98px | 375       |
 */
describe('the intrinsic heading scale', () => {
  const SUBJECTS = [
    ['h1', '32px', 48, '21.44px', 322],
    ['h2', '24px', 36, '19.92px', 299],
    ['h3', '18.72px', 28, '18.72px', 281],
    ['h4', '16px', 24, '21.28px', 319],
    ['h5', '13.28px', 20, '22.18px', 333],
    ['h6', '10.72px', 16, '24.98px', 375],
  ] as const satisfies ReadonlyArray<
    readonly [TagName, UnitsSize, number, UnitsSize, number]
  >;

  for (const [tagName, fontSize, size, margin, spacing] of SUBJECTS) {
    test(`${tagName} is ${fontSize} bold with ${margin} margins`, () => {
      const typographyOptions = getValueOf(
        INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
        tagName,
      );

      expect(typographyOptions).toEqual({
        fontSize,
        fontWeight: 'bold',
        marginTop: margin,
        marginBottom: margin,
      });

      expect(parseTextRunOptions(NO_FONTS, typographyOptions)).toEqual({
        bold: true,
        size,
      });

      expect(parseParagraphOptions(NO_FONTS, typographyOptions)).toEqual({
        spacing: { before: spacing, after: spacing },
      });
    });
  }

  test('covers exactly h1 to h6', () => {
    expect(Object.keys(INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS)).toEqual(
      SUBJECTS.map(([tagName]) => tagName),
    );
  });

  test('is not applied as direct formatting through the tag map', () => {
    // A heading's scale reaches Word as a style, never as run properties on
    // the runs inside it: direct formatting would beat the variant an author
    // asked for with `<Typography as="h2" variant="heading1">`.
    for (const tagName of Object.keys(INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS)) {
      expect(INTRINSIC_TYPOGRAPHY_OPTIONS).not.toHaveProperty(tagName);
    }
  });
});

/**
 * The block tags whose typography the library declares itself, because its own
 * `*` rule resets what the user agent stylesheet gave them and Word has no
 * user agent stylesheet at all.
 *
 * | tag        | margin        | w:spacing | inset | w:ind     |
 * | blockquote | 16px / 40px   | 240       | 40px  | 600       |
 * | pre        | 16px          | 240       | --    | --        |
 * | code       | --            | --        | --    | --        |
 */
describe('the intrinsic typography of blockquote, pre and code', () => {
  const SUBJECTS = [
    [
      'blockquote',
      {
        marginTop: '16px',
        marginBottom: '16px',
        marginLeft: '40px',
        marginRight: '40px',
      },
      {
        spacing: { before: 240, after: 240 },
        indent: { left: 600, right: 600 },
      },
    ],
    [
      'pre',
      {
        fontFamily: MONOSPACE_FONT_FAMILY,
        whiteSpace: 'pre',
        marginTop: '16px',
        marginBottom: '16px',
      },
      { spacing: { before: 240, after: 240 } },
    ],
    // An inline tag has no margin box, so it contributes no paragraph
    // properties at all: its font is named on the run.
    ['code', { fontFamily: MONOSPACE_FONT_FAMILY }, {}],
  ] as const satisfies ReadonlyArray<
    readonly [TagName, TypographyOptions, IParagraphPropertiesOptions]
  >;

  for (const [tagName, typographyOptions, paragraphOptions] of SUBJECTS) {
    test(`${tagName} == ${JSON.stringify(paragraphOptions)}`, () => {
      expect(INTRINSIC_TAG_TYPOGRAPHY_OPTIONS[tagName]).toEqual(
        typographyOptions,
      );

      expect(
        parseParagraphOptions(
          NO_FONTS,
          INTRINSIC_TAG_TYPOGRAPHY_OPTIONS[tagName],
        ),
      ).toEqual(paragraphOptions);

      expect(warn).not.toHaveBeenCalled();
    });
  }

  test('covers exactly blockquote, pre and code', () => {
    expect(Object.keys(INTRINSIC_TAG_TYPOGRAPHY_OPTIONS)).toEqual(
      SUBJECTS.map(([tagName]) => tagName),
    );
  });

  test('is not applied as direct formatting through the tag map', () => {
    // These reach Word through the branch that builds the tag's paragraph, not
    // through the run options every descendant of the tag inherits: a
    // `blockquote` must not indent a table inside it twice, and `monospace` is
    // a generic family no `w:rFonts` can name.
    for (const tagName of Object.keys(INTRINSIC_TAG_TYPOGRAPHY_OPTIONS)) {
      expect(INTRINSIC_TYPOGRAPHY_OPTIONS).not.toHaveProperty(tagName);
    }
  });

  test('never resolves the generic monospace family to a font face', () => {
    // Word names one installed font; the generic family is translated by the
    // DOCX mapper instead of being looked up in the font configuration.
    expect(
      parseTextRunOptions(NO_FONTS, {
        marginLeft: INTRINSIC_TAG_TYPOGRAPHY_OPTIONS.blockquote.marginLeft,
      }),
    ).toEqual({});
  });
});
