import {
  AlignmentType,
  type IParagraphPropertiesOptions,
  type IRunPropertiesOptions,
  type ISpacingProperties,
  BorderStyle,
  LineRuleType,
} from 'docx';
import {
  type LineBox,
  type TypographyOptions,
  type TypographyOptionsFlat,
  assignTypographyOptions,
  capHeightToFontSize,
  typographyOptionsToFlat,
  findFontFace,
  getFontFaceSource,
  getFontFace,
  resolveLineBoxFont,
  type FontsConfig,
  type FontFace,
  type UnitsSize,
} from '../../entities';
import { isFontStyleItalicish, isFontWeightBoldish } from '../../utils/font';
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

const parseFontFace = (fontFace: undefined | FontFace): undefined | string =>
  fontFace?.src;

/**
 * The font a run names and the bold and italic toggles that pick its style.
 *
 * A face with a `docx` source names that installed font, and the run's own
 * weight and style set the toggles. A face Word knows by its embedded file
 * (`wordFont`) is matched as the browser matches it, from the run's family,
 * weight and style over the ones it inherits, and names the family its file
 * names itself: the toggles pick the file's own style in that family, plus
 * the bold or italic a browser synthesizes when the face has none. They are
 * written whenever the typography states them, since a file of a weight
 * other than regular or bold is the regular style of a family of its own.
 */
const parseRunFont = (
  fonts: FontsConfig,
  typographyOptions: TypographyOptions,
  inheritedTypography: undefined | TypographyOptions,
): Pick<IRunPropertiesOptions, 'font' | 'bold' | 'italics'> => {
  const { fontFamily, fontWeight, fontStyle } =
    typographyOptionsToFlat(typographyOptions);
  const typography = typographyOptionsToFlat(
    assignTypographyOptions({}, inheritedTypography, typographyOptions),
  );
  // A run that states none of them inherits its font whole.
  const fontFace = [fontFamily, fontWeight, fontStyle].some(
    (value) => value !== undefined,
  )
    ? findFontFace(fonts, typography)?.fontFace
    : undefined;
  const wordFont =
    fontFace && !getFontFaceSource(fontFace, 'docx')
      ? fontFace.wordFont
      : undefined;
  if (fontFace && wordFont) {
    const bold =
      wordFont.bold ||
      (typography.fontWeight === 'bold' &&
        !isFontWeightBoldish(fontFace.fontWeight));
    const italics =
      wordFont.italic ||
      (typography.fontStyle === 'italic' &&
        !isFontStyleItalicish(fontFace.fontStyle));
    return {
      font: wordFont.fontName,
      bold: bold || (typography.fontWeight === undefined ? undefined : false),
      italics:
        italics || (typography.fontStyle === undefined ? undefined : false),
    };
  }
  return {
    font: parseFontFace(
      getFontFace(
        { fonts, documentType: 'docx' },
        { fontFamily, fontWeight, fontStyle },
      ),
    ),
    bold: ifTruthy(fontWeight, fontWeight === 'bold'),
    italics: ifTruthy(fontStyle, fontStyle === 'italic'),
  };
};

/**
 * `w:sz` is a font size in half-points. CSS `font-size: normal` has no Word
 * equivalent, so nothing is emitted and the run inherits its size.
 */
const parseFontSize = (fontSize: TypographyOptionsFlat['fontSize']) =>
  fontSize &&
  (fontSize === 'normal' ? undefined : toHalfPoints(toPt(fontSize)));

const toHalfPoints = (valuePt: number) => Math.round(valuePt * 2);

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

const TWIP_PER_PT = 20;

/**
 * A resolved line box as `w:spacing`. Every paragraph is `lineRule="exact"`,
 * the one rule under which Word puts the baseline at the same place whatever
 * the font (`0.8 × L + 0.25pt` below the line's top), so the CSS line height
 * means the same thing in both targets. A paragraph holding a picture is
 * `atLeast`: an exact line would clip it where CSS grows the line box.
 */
export const parseLineSpacing = (
  { lineHeight }: LineBox,
  { atLeast }: { atLeast: boolean },
): Pick<ISpacingProperties, 'line' | 'lineRule'> => ({
  // A line with no height at all is not a line.
  line: Math.max(Math.round(lineHeight * TWIP_PER_PT), 1),
  lineRule: atLeast ? LineRuleType.AT_LEAST : LineRuleType.EXACT,
});

/**
 * `typographyOptions` as run properties. A `capHeight` is measured in the
 * face the run is set in: its own family, else the one it inherits from
 * `inheritedTypography` (a variant, the document's defaults).
 */
export const parseTextRunOptions = (
  fonts: FontsConfig,
  typographyOptions: undefined | TypographyOptions,
  inheritedTypography?: TypographyOptions,
): undefined | IRunPropertiesOptions => {
  const {
    capHeight,
    fontSize,
    color,
    highlightColor,
    textTransform,
    textDecoration,
    superScript,
    subScript,
  } = typographyOptionsToFlat(typographyOptions ?? {});
  const { font, bold, italics } = parseRunFont(
    fonts,
    typographyOptions ?? {},
    inheritedTypography,
  );

  // `textAlign` is deliberately absent: alignment is a paragraph property in
  // OOXML and is emitted by parseParagraphOptions.
  return objectValuesDefined({
    font,
    size:
      capHeight === undefined
        ? ifTruthy(fontSize, parseFontSize(fontSize))
        : toHalfPoints(
            capHeightToFontSize(
              capHeight,
              resolveLineBoxFont(
                fonts,
                assignTypographyOptions(
                  {},
                  inheritedTypography,
                  typographyOptions,
                ),
              ),
            ),
          ),
    color: toDocxColor(color),
    shading: ifTruthy(highlightColor, { fill: toDocxColor(highlightColor) }),
    bold,
    italics,
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
