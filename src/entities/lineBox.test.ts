import { describe, expect, test } from 'vitest';
import type { FontMetrics, FontsConfig } from './fonts';
import {
  MissingFontMetricsError,
  capHeightToFontSize,
  isTrimmedLineBox,
  resolveLineBox,
  resolveLineBoxFont,
  wordSpaceAboveCapHeight,
  wordSpaceBelowBaseline,
} from './lineBox';
import { assignTypographyOptions, resolveBlockTypography } from './typography';

/** Arial's metrics, as `@capsizecss/unpack` reads them from Word's copy. */
const ARIAL: FontMetrics = {
  unitsPerEm: 2048,
  ascent: 1854,
  descent: -434,
  lineGap: 67,
  capHeight: 1467,
};

const WITH_ARIAL = { fontFamily: 'Arial', metrics: ARIAL };

const WITHOUT_METRICS = { fontFamily: 'Arial', metrics: undefined };

const NO_FONT = { fontFamily: undefined, metrics: undefined };

describe('resolveLineBox', () => {
  test('multiplies a unitless line height by the font size', () => {
    expect(
      resolveLineBox({ fontSize: '12pt', lineHeight: '1.5' }, NO_FONT),
    ).toMatchObject({ fontSize: 12, lineHeight: 18, trim: false });
  });

  test('falls back to the CSS initial font size of 16px', () => {
    expect(resolveLineBox({ lineHeight: '1.5' }, NO_FONT)).toMatchObject({
      fontSize: 12,
      lineHeight: 18,
    });
  });

  test('takes a length as the line height', () => {
    expect(
      resolveLineBox({ fontSize: '10pt', lineHeight: '24px' }, NO_FONT),
    ).toMatchObject({ fontSize: 10, lineHeight: 18 });
  });

  test("resolves `normal` to the font's hhea single line, Word's single", () => {
    const lineBox = resolveLineBox(
      { fontSize: '12pt', lineHeight: 'normal' },
      WITH_ARIAL,
    );
    // Word measures 13.8pt for Arial 12pt single.
    expect(lineBox?.lineHeight).toBeCloseTo(13.799, 3);
  });

  test('resolves no line height to `normal` when the font has metrics', () => {
    expect(
      resolveLineBox({ fontSize: '12pt' }, WITH_ARIAL)?.lineHeight,
    ).toBeCloseTo(13.799, 3);
  });

  test('resolves nothing when no line height is set and no metrics exist', () => {
    expect(resolveLineBox({ fontSize: '12pt' }, WITHOUT_METRICS)).toBe(
      undefined,
    );
  });

  test('carries the cap height, ascent and descent when metrics exist', () => {
    const lineBox = resolveLineBox(
      { fontSize: '20.48pt', lineHeight: '24pt' },
      WITH_ARIAL,
    );
    expect(lineBox?.capHeight).toBeCloseTo(14.67);
    expect(lineBox?.ascent).toBeCloseTo(18.54);
    expect(lineBox?.descent).toBeCloseTo(4.34);
  });

  test('sizes the font by its cap height', () => {
    const lineBox = resolveLineBox(
      { capHeight: '14.67pt', lineHeight: '1.25' },
      WITH_ARIAL,
    );
    expect(lineBox?.fontSize).toBeCloseTo(20.48);
    expect(lineBox?.lineHeight).toBeCloseTo(25.6);
    expect(lineBox?.capHeight).toBeCloseTo(14.67);
  });

  test('marks a trimmed text box, which always knows its cap height', () => {
    const lineBox = resolveLineBox(
      { fontSize: '12pt', lineHeight: '18pt', textBoxTrim: 'both' },
      WITH_ARIAL,
    );
    expect(lineBox?.trim).toBe(true);
    expect(isTrimmedLineBox(lineBox)).toBe(true);
    expect(
      isTrimmedLineBox(
        resolveLineBox({ lineHeight: '18pt', textBoxTrim: 'none' }, WITH_ARIAL),
      ),
    ).toBe(false);
  });

  describe('without the font metrics it needs', () => {
    test.each([
      [{ lineHeight: 'normal' }, '`lineHeight: normal`'],
      [{ capHeight: '10pt' }, '`capHeight`'],
      [{ lineHeight: '18pt', textBoxTrim: 'both' }, '`textBoxTrim`'],
    ] as const)('refuses %j', (typography, option) => {
      expect(() => resolveLineBox(typography, WITHOUT_METRICS)).toThrow(
        MissingFontMetricsError,
      );
      expect(() => resolveLineBox(typography, WITHOUT_METRICS)).toThrow(
        `${option} needs the metrics of the font "Arial"`,
      );
    });

    test('asks for a default font when the text names no family', () => {
      expect(() => resolveLineBox({ lineHeight: 'normal' }, NO_FONT)).toThrow(
        'defaultTypography.fontFamily',
      );
    });
  });
});

describe('capHeightToFontSize', () => {
  test("divides the cap height by the font's cap height per em", () => {
    expect(capHeightToFontSize('1467pt', WITH_ARIAL)).toBeCloseTo(2048);
  });
});

describe("Word's exact line", () => {
  const lineBox = resolveLineBox(
    { fontSize: '12pt', lineHeight: '18pt', textBoxTrim: 'both' },
    WITH_ARIAL,
  );

  test('puts the baseline 0.8 L + 0.25pt below the top of the line', () => {
    if (!isTrimmedLineBox(lineBox)) {
      throw new Error('Expected a trimmed line box.');
    }
    // 0.8 × 18 + 0.25 − 12 × 1467 / 2048
    expect(wordSpaceAboveCapHeight(lineBox)).toBeCloseTo(6.0543, 4);
  });

  test('leaves 0.2 L − 0.25pt below the baseline', () => {
    if (!lineBox) {
      throw new Error('Expected a line box.');
    }
    expect(wordSpaceBelowBaseline(lineBox)).toBeCloseTo(3.35);
  });
});

describe('resolveLineBoxFont', () => {
  const FONTS: FontsConfig = {
    Arial: {
      fontFaces: [
        {
          fontWeight: '400',
          fontStyle: 'normal',
          sources: [{ src: '/arial.ttf', format: 'truetype' }],
          metrics: ARIAL,
        },
        {
          fontWeight: '700',
          fontStyle: 'normal',
          sources: [{ src: '/arial-bold.ttf', format: 'truetype' }],
        },
      ],
    },
  };

  test('finds the metrics of the matching face', () => {
    expect(
      resolveLineBoxFont(FONTS, { fontFamily: 'Arial, sans-serif' }),
    ).toEqual(WITH_ARIAL);
    expect(
      resolveLineBoxFont(FONTS, { fontFamily: 'Arial', fontWeight: 'bold' }),
    ).toEqual(WITHOUT_METRICS);
  });

  test('names no family for text that sets none', () => {
    expect(resolveLineBoxFont(FONTS, {})).toEqual(NO_FONT);
  });
});

describe('assignTypographyOptions', () => {
  test('lets the later of fontSize and capHeight win', () => {
    expect(
      assignTypographyOptions({}, { fontSize: '12pt' }, { capHeight: '8pt' }),
    ).toEqual({ capHeight: '8pt' });
    expect(
      assignTypographyOptions({}, { capHeight: '8pt' }, { fontSize: '12pt' }),
    ).toEqual({ fontSize: '12pt' });
  });
});

describe('resolveBlockTypography', () => {
  test('lays defaults, the tag, its variants and the inline options in order', () => {
    expect(
      resolveBlockTypography({
        defaultTypography: {
          fontFamily: 'Arial',
          fontSize: '11pt',
          lineHeight: '1.4',
        },
        variants: {
          heading2: { lineHeight: '1.1' },
          lead: { textBoxTrim: 'both' },
        },
        tagName: 'h2',
        variant: 'lead',
        contentOptions: { marginTop: '4pt' },
      }),
    ).toEqual({
      fontFamily: 'Arial',
      // The intrinsic heading scale.
      fontSize: '24px',
      fontWeight: 'bold',
      marginTop: '4pt',
      marginBottom: '19.92px',
      lineHeight: '1.1',
      textBoxTrim: 'both',
    });
  });
});
