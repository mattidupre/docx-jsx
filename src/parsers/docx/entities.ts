import { convertUnits, type UnitsSize } from '../../entities';

const TWIP_PER_PT = 20;

/**
 * The unit OOXML counts font sizes in (half-points) and, through
 * {@link toTwip}, everything else. Relative and unknown units are refused by
 * `convertUnits` rather than guessed at.
 */
export const toPt = (value: UnitsSize): number => convertUnits(value, 'pt');

export const toTwip = (value: UnitsSize): number => toPt(value) * TWIP_PER_PT;

/**
 * `docx` sizes a picture in CSS pixels, which OOXML calls 96 DPI: the same unit
 * the browser lays the `<img>` out in, so one length means one size in both
 * targets.
 */
export const toPx = (value: UnitsSize): number => convertUnits(value, 'px');

/**
 * Every OOXML measurement written as `ST_TwipsMeasure` is a whole number of
 * twips. A CSS length handed to `docx` verbatim ends up in the file as
 * `w:w="8.5in"`, which Word and every converter measure differently (or not at
 * all).
 */
export const toWholeTwip = (value: UnitsSize): number =>
  Math.round(toTwip(value));

/**
 * ECMA-376 CT_Border writes `w:sz` in eighths of a point, capped at 12pt. A rule
 * the document asked for is never rounded away to nothing, so the floor is one
 * eighth rather than zero, which is how a border is switched off.
 */
const BORDER_WIDTH_EIGHTHS_PER_PT = 8;
const BORDER_WIDTH_EIGHTHS_MAX = 96;

export const toBorderWidthEighths = (value: UnitsSize): number =>
  Math.min(
    Math.max(Math.round(toPt(value) * BORDER_WIDTH_EIGHTHS_PER_PT), 1),
    BORDER_WIDTH_EIGHTHS_MAX,
  );
