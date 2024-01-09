import {
  AlignmentType,
  type IParagraphPropertiesOptions,
  type IRunPropertiesOptions,
  BorderStyle,
  LineRuleType,
} from 'docx';
import {
  type Color,
  type TypographyOptions,
  type TypographyOptionsFlat,
  typographyOptionsToFlat,
  getFontFace,
  type FontsConfig,
  type FontFace,
  type UnitsPx,
  type UnitsRem,
} from '../../entities';
import { objectValuesDefined } from '../../utils/object';

const REM_SIZE_PX = 12;

const PT_PER_PX = 3 / 4;

const DOCX_TEXT_ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

type Units = UnitsPx | UnitsRem;

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

const toPt = (value: Units): number => {
  const float = Number.parseFloat(value);
  if (!isNaN(float)) {
    if (value.endsWith('rem')) {
      return float * REM_SIZE_PX * PT_PER_PX;
    }
    if (value.endsWith('px')) {
      return float * PT_PER_PX;
    }
  }
  throw new TypeError(`Expected value to be px or rem, received ${value}`);
};

const toTwip = (value: Units): number => toPt(value) * 20;

const parseColor = (color: undefined | 'currentColor' | Color) =>
  color && (color === 'currentColor' ? undefined : color.replace('#', ''));

// For now only support default docx font names
const parseFontFace = (fontFace: undefined | FontFace): undefined | string =>
  fontFace?.src;

const parseFontSize = (fontSize: TypographyOptionsFlat['fontSize']) =>
  fontSize &&
  (fontSize === 'normal' ? undefined : Math.round(toPt(fontSize) * 2));

const parseBorderWidth = (borderWidth: undefined | Units) =>
  borderWidth && Math.round(clamp(toPt(borderWidth), 0, 12) * 8);

const parseBorderSpace = (padding: undefined | Units) =>
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
    alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
    size: fontSize && parseFontSize(fontSize),
    color: parseColor(color),
    shading: highlightColor && {
      fill: parseColor(highlightColor),
    },
    bold: fontWeight && fontWeight === 'bold',
    italics: fontStyle && fontStyle === 'italic',
    allCaps: textTransform && textTransform === 'uppercase',
    underline:
      textDecoration && textDecoration === 'underline' ? {} : undefined,
    strike:
      textDecoration && textDecoration === 'line-through' ? true : undefined,
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
    marginBottom,
    paddingBottom,
    borderBottomColor,
    borderBottomWidth,
    textIndent,
  } = typographyOptionsToFlat(typographyOptions ?? {});

  return objectValuesDefined({
    border: {
      bottom: borderBottomWidth && {
        color: parseColor(borderBottomColor),
        style: BorderStyle.SINGLE,
        space: parseBorderSpace(paddingBottom),
        size: parseBorderWidth(borderBottomWidth),
      },
    },
    spacing: {
      after: marginBottom && toTwip(marginBottom),
      line: lineHeight && parseFloat(lineHeight) * 240,
      lineRule: LineRuleType.EXACT,
    },
    indent: {
      firstLine: textIndent && toTwip(textIndent),
    },
    alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
    shading: highlightColor && {
      fill: parseColor(highlightColor),
    },
  } satisfies IParagraphPropertiesOptions);
};
