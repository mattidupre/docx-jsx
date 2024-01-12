import {
  AlignmentType,
  type IParagraphPropertiesOptions,
  type IRunPropertiesOptions,
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
} from '../../entities';
import { objectValuesDefined } from '../../utils/object';
import { type DocxUnits, toPt, toTwip } from './entities';
import { toDocxColor } from './toDocxColor';

// TODO: Create function to check that value is not --foo or var().

const DOCX_TEXT_ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const ifTruthy = <TValue, TValueIn>(
  valueIn: TValueIn,
  value: TValue | { (value: TValueIn): TValue },
) =>
  (valueIn
    ? typeof value === 'function'
      ? (value as { (v: any): any })(valueIn)
      : value
    : undefined) as undefined | Exclude<TValue, false | 0 | '' | null>;

const clamp = (value: number, min: number, max: number) => {
  if (value < min) {
    console.warn(`Expected value greater than ${min}, received ${value}`);
    return min;
  }

  if (value > max) {
    console.warn(`Expected value less than ${max}, received ${value}`);
    return max;
  }

  return value;
};

// For now only support default docx font names
const parseFontFace = (fontFace: undefined | FontFace): undefined | string =>
  fontFace?.src;

const parseFontSize = (fontSize: TypographyOptionsFlat['fontSize']) =>
  fontSize &&
  (fontSize === 'normal' ? undefined : Math.round(toPt(fontSize) * 2));

const parseBorderWidth = (borderWidth: undefined | DocxUnits) =>
  borderWidth && Math.round(clamp(toPt(borderWidth), 0, 12) * 8);

const parseBorderSpace = (padding: undefined | DocxUnits) =>
  padding && Math.round(clamp(toPt(padding), 0, 31));

export const parseTextRunOptions = (
  fonts: FontsConfig,
  typographyOptions: undefined | TypographyOptions,
): undefined | IRunPropertiesOptions => {
  const {
    textAlign,
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

  return objectValuesDefined({
    font: parseFontFace(
      getFontFace(
        { fonts, documentType: 'docx' },
        { fontFamily, fontWeight, fontStyle },
      ),
    ),
    alignment: ifTruthy(textAlign, DOCX_TEXT_ALIGN[textAlign]),
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
  });
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
    marginBottom,
    marginLeft,
    paddingBottom,
    borderBottomColor,
    borderBottomWidth,
    textIndent,
  } = typographyOptionsToFlat(typographyOptions ?? {});

  return objectValuesDefined({
    border: {
      bottom: ifTruthy(borderBottomWidth, {
        color: toDocxColor(borderBottomColor),
        style: BorderStyle.SINGLE,
        space: parseBorderSpace(paddingBottom),
        size: parseBorderWidth(borderBottomWidth),
      }),
    },
    spacing: {
      before: marginTop && toTwip(marginTop),
      after: marginBottom && toTwip(marginBottom),
      line: lineHeight && parseFloat(lineHeight) * 240,
      lineRule: LineRuleType.EXACT,
    },
    indent: {
      firstLine: textIndent && toTwip(textIndent),
      left: marginLeft && toTwip(marginLeft),
    },
    alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
    shading: ifTruthy(highlightColor, {
      fill: toDocxColor(highlightColor),
    }),
  } satisfies IParagraphPropertiesOptions);
};
