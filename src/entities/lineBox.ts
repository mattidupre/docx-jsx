import {
  type FontMetrics,
  type FontsConfig,
  findFontFace,
  toFontFamilyName,
} from './fonts';
import { type TypographyOptions, typographyOptionsToFlat } from './typography';
import {
  ROOT_FONT_SIZE_PX,
  convertUnits,
  isUnitsUnitless,
  type UnitsSize,
} from './units';

/**
 * The line model both targets lay text out by, resolved once from the
 * typography and the metrics of the font file (`flow-parity.md`, "Line model
 * measurements"). The CSS targets write it as an absolute `line-height` (and a
 * trimmed text box), the DOCX target as `lineRule="exact"` spacing, so a line
 * is the same height in both whatever the font.
 */

/** Every length of a {@link LineBox}, in points. */
export type LineBox = {
  fontSize: number;
  /**
   * The leading L, the distance between two baselines: a multiplier of the
   * font size, an absolute length, or for `normal` the font's own single line
   * (`hhea` ascent + descent + line gap), which is what Word calls single.
   */
  lineHeight: number;
  /** Undefined when the font's metrics are unknown and nothing needs them. */
  capHeight: undefined | number;
  ascent: undefined | number;
  /** Below the baseline, as a positive length. */
  descent: undefined | number;
  /** The text box is trimmed to the cap height and the alphabetic baseline. */
  trim: boolean;
};

/** A trimmed line box, which always knows its cap height. */
export type TrimmedLineBox = LineBox & { trim: true; capHeight: number };

export const isTrimmedLineBox = (
  lineBox: undefined | LineBox,
): lineBox is TrimmedLineBox =>
  lineBox?.trim === true && lineBox.capHeight !== undefined;

/** The CSS initial font size (`medium`), which is every target's fallback. */
const DEFAULT_FONT_SIZE: UnitsSize = `${ROOT_FONT_SIZE_PX}px`;

export type LineBoxTypography = Pick<
  TypographyOptions,
  | 'fontFamily'
  | 'fontWeight'
  | 'fontStyle'
  | 'fontSize'
  | 'capHeight'
  | 'lineHeight'
  | 'textBoxTrim'
>;

/** The font the metrics of a {@link LineBox} come from, for error messages. */
export type LineBoxFont = {
  /** The family the text is set in, when it names one. */
  fontFamily: undefined | string;
  metrics: undefined | FontMetrics;
};

/**
 * Thrown when text needs the metrics of its font (`lineHeight: normal`,
 * `capHeight` or `textBoxTrim`) and its font has none.
 */
export class MissingFontMetricsError extends Error {
  constructor(option: string, fontFamily: undefined | string) {
    super(
      fontFamily === undefined
        ? `\`${option}\` needs the metrics of the font the text is set in, and the text names no font family. Give the document a default font (\`defaultTypography.fontFamily\` on DocumentProvider) whose face has a font file.`
        : `\`${option}\` needs the metrics of the font "${fontFamily}", and its face has none. Declare the face in \`fonts\` with a font file (a \`web\` or \`pdf\` source the renderer can read through \`publicDirectory\`), or give it \`metrics\`.`,
    );
    this.name = 'MissingFontMetricsError';
  }
}

const perEm = (value: number, { unitsPerEm }: FontMetrics) =>
  value / unitsPerEm;

const requireMetrics = (
  option: string,
  { fontFamily, metrics }: LineBoxFont,
): FontMetrics => {
  if (!metrics) {
    throw new MissingFontMetricsError(option, fontFamily);
  }
  return metrics;
};

/**
 * The font size, in points, that gives capitals of `capHeight` in `font`:
 * capsize's `capHeight / (capHeight / unitsPerEm)`.
 *
 * @throws {MissingFontMetricsError} when the font has no metrics.
 */
export const capHeightToFontSize = (
  capHeight: UnitsSize,
  font: LineBoxFont,
): number => {
  const metrics = requireMetrics('capHeight', font);
  return convertUnits(capHeight, 'pt') / perEm(metrics.capHeight, metrics);
};

/**
 * The line box of text set in `typography`, in points, or undefined when the
 * text names no line height and its font has no metrics: then nothing is
 * resolved and both targets keep their own `normal`, as before.
 *
 * `capHeight` sizes the text by its capitals, as capsize does: the font size
 * is the cap height divided by the font's cap height per em.
 *
 * @throws {MissingFontMetricsError} when `lineHeight: normal`, `capHeight` or
 * `textBoxTrim: both` is asked for and the font has no metrics.
 */
export const resolveLineBox = (
  typography: LineBoxTypography,
  font: LineBoxFont,
): undefined | LineBox => {
  const { fontSize, capHeight, lineHeight, textBoxTrim } =
    typographyOptionsToFlat(typography);
  const require = (option: string) => requireMetrics(option, font);

  const trim = textBoxTrim === 'both';

  const fontSizePt =
    capHeight !== undefined
      ? capHeightToFontSize(capHeight, font)
      : convertUnits(
          fontSize === undefined || fontSize === 'normal'
            ? DEFAULT_FONT_SIZE
            : fontSize,
          'pt',
        );

  if (trim) {
    // A trimmed box is cut to the cap height, which only the metrics know.
    require('textBoxTrim');
  }
  const { metrics } = font;
  const normalLineHeight = (lineMetrics: FontMetrics) =>
    perEm(
      lineMetrics.ascent + Math.abs(lineMetrics.descent) + lineMetrics.lineGap,
      lineMetrics,
    ) * fontSizePt;

  let lineHeightPt: number;
  if (lineHeight === undefined) {
    if (!metrics) {
      return undefined;
    }
    lineHeightPt = normalLineHeight(metrics);
  } else if (lineHeight === 'normal') {
    lineHeightPt = normalLineHeight(require('lineHeight: normal'));
  } else if (isUnitsUnitless(lineHeight)) {
    lineHeightPt = Number.parseFloat(lineHeight) * fontSizePt;
  } else {
    lineHeightPt = convertUnits(lineHeight, 'pt');
  }

  return {
    fontSize: fontSizePt,
    lineHeight: lineHeightPt,
    capHeight: metrics && perEm(metrics.capHeight, metrics) * fontSizePt,
    ascent: metrics && perEm(metrics.ascent, metrics) * fontSizePt,
    descent: metrics && perEm(Math.abs(metrics.descent), metrics) * fontSizePt,
    trim,
  };
};

/** The face `typography` is set in and its metrics, from `fonts`. */
export const resolveLineBoxFont = (
  fonts: FontsConfig,
  typography: LineBoxTypography,
): LineBoxFont => ({
  fontFamily: toFontFamilyName(typographyOptionsToFlat(typography).fontFamily),
  metrics: findFontFace(fonts, typography)?.fontFace.metrics,
});

/**
 * Where Word puts the baseline of a `lineRule="exact"` line of height L:
 * `0.8 × L + 0.25pt` below the line's top, whatever the font, its size or L
 * (measured in Word 16 over 24 cases, `flow-parity.md`).
 */
const WORD_EXACT_BASELINE_RATIO = 0.8;

const WORD_EXACT_BASELINE_OFFSET_PT = 0.25;

/**
 * The space Word leaves above the capitals of the first line of an exact
 * paragraph, which a trimmed CSS box does not have: from the top of the line
 * to the baseline, less the cap height. In points.
 */
export const wordSpaceAboveCapHeight = ({
  lineHeight,
  capHeight,
}: Pick<TrimmedLineBox, 'lineHeight' | 'capHeight'>): number =>
  WORD_EXACT_BASELINE_RATIO * lineHeight +
  WORD_EXACT_BASELINE_OFFSET_PT -
  capHeight;

/**
 * The space Word leaves below the baseline of the last line of an exact
 * paragraph, which a trimmed CSS box does not have. In points.
 */
export const wordSpaceBelowBaseline = ({
  lineHeight,
}: Pick<LineBox, 'lineHeight'>): number =>
  (1 - WORD_EXACT_BASELINE_RATIO) * lineHeight - WORD_EXACT_BASELINE_OFFSET_PT;
