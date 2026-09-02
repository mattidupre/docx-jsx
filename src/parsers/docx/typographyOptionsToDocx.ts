import {
  AlignmentType,
  type IParagraphPropertiesOptions,
  type IRunPropertiesOptions,
  type ISpacingProperties,
  BorderStyle,
  LineRuleType,
} from 'docx';
import {
  type TypographyOptions,
  type TypographyOptionsFlat,
  typographyOptionsToFlat,
  getFontFace,
  type FontsConfig,
  type FontFace,
  type UnitsSize,
  type UnitsUnitless,
} from '../../entities';
import { type KeyedObject, objectValuesDefined } from '../../utils/object';
import { toPt, toTwip } from './entities';

import { toDocxColor } from './toDocxColor';

// TODO: Create function to check that value is not --foo or var().

const DOCX_TEXT_ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

/**
 * `w:line` counts 240ths of a line when `w:lineRule` is `auto`, so a unitless
 * CSS line-height multiplier of 1 is 240.
 */
const LINE_UNITS_PER_LINE = 240;

/**
 * ECMA-376 CT_Border: `w:sz` is a width in eighths of a point documented as
 * 2..96 (0.25pt..12pt) and `w:space` is a padding in points documented as
 * 0..31. The lower bound here is 0 rather than 0.25pt because `0` is how a
 * border is turned off, and Word accepts it.
 */
const BORDER_WIDTH_PT_MIN = 0;
const BORDER_WIDTH_PT_MAX = 12;
const BORDER_WIDTH_EIGHTHS_PER_PT = 8;
const BORDER_SPACE_PT_MIN = 0;
const BORDER_SPACE_PT_MAX = 31;

const UNITLESS_EXP = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;

const isUnitless = (value: string): value is UnitsUnitless =>
  UNITLESS_EXP.test(value);

const ifTruthy = <TValue, TValueIn>(
  valueIn: TValueIn,
  value: TValue | { (value: TValueIn): TValue },
) =>
  (valueIn
    ? typeof value === 'function'
      ? (value as { (v: any): any })(valueIn)
      : value
    : undefined) as undefined | Exclude<TValue, false | 0 | '' | null>;

/**
 * Strip undefined values, and collapse an object with nothing left in it to
 * undefined so it can be omitted from the docx options entirely.
 */
const definedObject = <TValue extends KeyedObject>(value: TValue) => {
  const defined = objectValuesDefined(value);
  return Object.keys(defined).length > 0 ? defined : undefined;
};

const clampPt = (
  property: string,
  value: number,
  min: number,
  max: number,
): number => {
  if (value < min) {
    console.warn(
      `Expected ${property} to be at least ${min}pt, received ${value}pt.`,
    );
    return min;
  }

  if (value > max) {
    console.warn(
      `Expected ${property} to be at most ${max}pt, received ${value}pt.`,
    );
    return max;
  }

  return value;
};

// For now only support default docx font names
const parseFontFace = (fontFace: undefined | FontFace): undefined | string =>
  fontFace?.src;

/**
 * `w:sz` is a font size in half-points. CSS `font-size: normal` has no Word
 * equivalent, so nothing is emitted and the run inherits its size.
 */
const parseFontSize = (fontSize: TypographyOptionsFlat['fontSize']) =>
  fontSize &&
  (fontSize === 'normal' ? undefined : Math.round(toPt(fontSize) * 2));

const parseBorderWidth = (borderWidth: undefined | UnitsSize) =>
  borderWidth &&
  Math.round(
    clampPt(
      'borderBottomWidth',
      toPt(borderWidth),
      BORDER_WIDTH_PT_MIN,
      BORDER_WIDTH_PT_MAX,
    ) * BORDER_WIDTH_EIGHTHS_PER_PT,
  );

const parseBorderSpace = (padding: undefined | UnitsSize) =>
  padding &&
  Math.round(
    clampPt(
      'paddingBottom',
      toPt(padding),
      BORDER_SPACE_PT_MIN,
      BORDER_SPACE_PT_MAX,
    ),
  );

/**
 * CSS `line-height` mapped onto `w:spacing`:
 * - `normal` is font-dependent in CSS and has no fixed Word equivalent, so
 *   nothing is emitted and Word applies its own single spacing.
 * - a unitless multiplier scales the font size, which is what `lineRule="auto"`
 *   does in 240ths of a line.
 * - an absolute length is a fixed leading, which is `lineRule="exact"` in twips.
 */
const parseLineSpacing = (
  lineHeight: TypographyOptionsFlat['lineHeight'],
): undefined | Pick<ISpacingProperties, 'line' | 'lineRule'> => {
  if (!lineHeight || lineHeight === 'normal') {
    return undefined;
  }
  if (isUnitless(lineHeight)) {
    return {
      line: Math.round(Number.parseFloat(lineHeight) * LINE_UNITS_PER_LINE),
      lineRule: LineRuleType.AUTO,
    };
  }
  return {
    line: Math.round(toTwip(lineHeight)),
    lineRule: LineRuleType.EXACT,
  };
};

export const parseTextRunOptions = (
  fonts: FontsConfig,
  typographyOptions: undefined | TypographyOptions,
): undefined | IRunPropertiesOptions => {
  const {
    fontSize,
    color,
    fontFamily,
    highlightColor,
    fontWeight,
    fontStyle,
    textTransform,
    textDecoration,
    superScript,
    subScript,
  } = typographyOptionsToFlat(typographyOptions ?? {});

  // `textAlign` is deliberately absent: alignment is a paragraph property in
  // OOXML and is emitted by parseParagraphOptions.
  return objectValuesDefined({
    font: parseFontFace(
      getFontFace(
        { fonts, documentType: 'docx' },
        { fontFamily, fontWeight, fontStyle },
      ),
    ),
    size: ifTruthy(fontSize, parseFontSize(fontSize)),
    color: toDocxColor(color),
    shading: ifTruthy(highlightColor, { fill: toDocxColor(highlightColor) }),
    bold: ifTruthy(fontWeight, fontWeight === 'bold'),
    italics: ifTruthy(fontStyle, fontStyle === 'italic'),
    allCaps: ifTruthy(textTransform, textTransform === 'uppercase'),
    underline: ifTruthy(
      textDecoration,
      textDecoration === 'underline' ? {} : undefined,
    ),
    strike: ifTruthy(
      textDecoration,
      textDecoration === 'line-through' ? true : undefined,
    ),
    superScript,
    subScript,
  } satisfies IRunPropertiesOptions);
};

export const parseParagraphOptions = (
  fonts: FontsConfig,
  typographyOptions: undefined | TypographyOptions,
): undefined | IParagraphPropertiesOptions => {
  const {
    textAlign,
    lineHeight,
    highlightColor,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    paddingBottom,
    borderBottomColor,
    borderBottomWidth,
    textIndent,
  } = typographyOptionsToFlat(typographyOptions ?? {});

  return objectValuesDefined({
    border: definedObject({
      bottom: ifTruthy(borderBottomWidth, () =>
        objectValuesDefined({
          color: toDocxColor(borderBottomColor),
          style: BorderStyle.SINGLE,
          space: parseBorderSpace(paddingBottom),
          size: parseBorderWidth(borderBottomWidth),
        }),
      ),
    }),
    spacing: definedObject({
      before: marginTop && Math.round(toTwip(marginTop)),
      after: marginBottom && Math.round(toTwip(marginBottom)),
      ...parseLineSpacing(lineHeight),
    }),
    indent: definedObject({
      firstLine: textIndent && Math.round(toTwip(textIndent)),
      left: marginLeft && Math.round(toTwip(marginLeft)),
      right: marginRight && Math.round(toTwip(marginRight)),
    }),
    alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
    shading: ifTruthy(highlightColor, {
      fill: toDocxColor(highlightColor),
    }),
  } satisfies IParagraphPropertiesOptions);
};
