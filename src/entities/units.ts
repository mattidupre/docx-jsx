import { isKeyOf } from '../utils/object';

export type UnitsPx = `${number}px`;

export type UnitsPt = `${number}pt`;

export type UnitsRem = `${number}rem`;

export type UnitsIn = `${number}in`;

export type UnitsCm = `${number}cm`;

export type UnitsSize = UnitsPx | UnitsPt | UnitsRem | UnitsIn | UnitsCm;

/**
 * A number without units, e.g. the CSS `line-height: 1.2` multiplier.
 * Kept as a string so every typography value serializes the same way whether it
 * ends up in a CSS declaration, a CSS custom property or a data attribute.
 */
export type UnitsUnitless = `${number}`;

/**
 * The root font size `rem` values resolve against.
 *
 * The library never declares `html { font-size }`, so browsers -- and therefore
 * the DOM and PDF targets -- resolve `rem` against the CSS initial value of
 * 16px. Word has no cascade to resolve against, so the DOCX target resolves
 * `rem` against this same constant and `1rem` means the same thing everywhere.
 */
export const ROOT_FONT_SIZE_PX = 16;

const PT_PER_IN = 72;

const PX_PER_IN = 96;

const CM_PER_IN = 2.54;

/**
 * Every absolute CSS length in points, which is the unit OOXML counts in
 * (half-points for a font size, twentieths for everything else).
 *
 * CSS pins all of these to each other exactly -- `1in` is `96px`, `72pt` and
 * `2.54cm` -- so one table is enough to convert any pair of them, and the DOM,
 * PDF and DOCX targets can never disagree about what a length means. The key
 * order is the order the units are listed in when a value names one this table
 * does not hold.
 */
const PT_PER_UNIT = {
  px: PT_PER_IN / PX_PER_IN,
  pt: 1,
  rem: (ROOT_FONT_SIZE_PX * PT_PER_IN) / PX_PER_IN,
  cm: PT_PER_IN / CM_PER_IN,
  in: PT_PER_IN,
} as const;

export type Units = keyof typeof PT_PER_UNIT;

const UNITS = Object.keys(PT_PER_UNIT) as ReadonlyArray<Units>;

const UNITS_LIST = `${UNITS.slice(0, -1).join(', ')}, or ${UNITS.at(-1)}`;

/**
 * Units CSS resolves against something Word cannot see at build time: the
 * inherited font size (`em`, `ex`, `ch`), the containing block (`%`) or the
 * viewport (`vw`, `vh`). They are rejected rather than guessed at so a value
 * never silently means something different in DOCX than it does in CSS.
 */
const RELATIVE_UNITS = ['em', 'ex', 'ch', '%', 'vw', 'vh', 'vmin', 'vmax'];

/**
 * An optional sign, an integer part, a fractional part or both, plus the
 * exponent notation `String(number)` falls back to for very small or large
 * values (`1e-7in`), followed by the unit.
 *
 * `%` is matched as a unit so that {@link parseUnitsSize} can name it in the
 * error it throws rather than reporting the whole value as malformed.
 */
const UNITS_SIZE_EXP = /^(-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)([a-z%]+)$/i;

/**
 * The amount and the unit of an absolute CSS length.
 *
 * @example
 * parseUnitsSize('8.5in'); // [8.5, 'in']
 * parseUnitsSize('2IN'); // [2, 'in']
 */
export const parseUnitsSize = (value: UnitsSize): readonly [number, Units] => {
  const [, amount, units] = UNITS_SIZE_EXP.exec(value) ?? [];
  if (units !== undefined) {
    const unitsLower = units.toLowerCase();
    if (isKeyOf(unitsLower, PT_PER_UNIT)) {
      return [Number.parseFloat(amount), unitsLower] as const;
    }
    if (RELATIVE_UNITS.includes(unitsLower)) {
      throw new TypeError(
        `Cannot convert relative unit "${unitsLower}" to an absolute length. Received ${value}.`,
      );
    }
  }
  throw new TypeError(`Expected value to be ${UNITS_LIST}. Received ${value}.`);
};

/**
 * `value` measured in `units`, as a plain number.
 *
 * A value already written in `units` is returned as it was parsed rather than
 * multiplied and divided by the same ratio, which would introduce binary
 * floating point noise into a length the caller wrote exactly.
 *
 * @example
 * convertUnits('1in', 'pt'); // 72
 * convertUnits('16px', 'rem'); // 1
 */
export const convertUnits = (value: UnitsSize, units: Units): number => {
  const [amount, valueUnits] = parseUnitsSize(value);
  if (valueUnits === units) {
    return amount;
  }
  return (amount * PT_PER_UNIT[valueUnits]) / PT_PER_UNIT[units];
};

/**
 * An amount and a unit written back as a CSS length.
 *
 * `NaN` and `Infinity` are refused: `"NaNin"` is a string nothing can read
 * back, and a length that cannot be parsed is worse than one that never
 * reached the document.
 */
export const toUnits = (value: number, units: Units): UnitsSize => {
  if (!isKeyOf(units, PT_PER_UNIT)) {
    throw new TypeError(`Invalid units "${units}".`);
  }
  if (!Number.isFinite(value)) {
    throw new TypeError(`Invalid unit value "${value}".`);
  }
  return `${value}${units}`;
};

/**
 * Arithmetic on CSS lengths, in the units of the first operand.
 *
 * The second operand may be a bare number (a scale factor, or an amount already
 * in the first operand's units) or another length in any unit this module
 * knows: mixed units are converted rather than refused, so a page in inches and
 * a margin in centimetres still add up.
 *
 * @example
 * mathUnits('subtract', '8.5in', '0.5in'); // '8in'
 * mathUnits('multiply', '11in', 0.5); // '5.5in'
 */
export const mathUnits = (
  method: 'add' | 'subtract' | 'multiply',
  str1: UnitsSize,
  str2: number | UnitsSize,
) => {
  const [value1, units1] = parseUnitsSize(str1);
  const value2 = typeof str2 === 'number' ? str2 : convertUnits(str2, units1);
  if (method === 'add') {
    return toUnits(value1 + value2, units1);
  }
  if (method === 'subtract') {
    return toUnits(value1 - value2, units1);
  }
  if (method === 'multiply') {
    return toUnits(value1 * value2, units1);
  }
  throw new TypeError(`Invalid math method "${method}".`);
};

/**
 * A `rem` length inside any CSS value: a declaration, a `calc()` expression or
 * the literal fallback of a `var()` chain. The lookbehind keeps it from
 * matching the tail of an identifier such as `--gap-2rem`.
 *
 * Quoted strings and `url()` are matched first, as alternatives that are put
 * back unchanged: a file named `2rem.png` or a font family named `"2rem"` is
 * not a length.
 */
const REM_LENGTH_EXP =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\burl\([^)]*\))|(?<![\w.-])(-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)rem\b/gi;

/**
 * Enough significant digits for any length a document declares, few enough to
 * drop the binary floating point noise of the multiplication.
 */
const REM_PRECISION = 12;

const remToPx = (amount: number) =>
  Number((amount * ROOT_FONT_SIZE_PX).toPrecision(REM_PRECISION));

/**
 * `value` with every `rem` length resolved to `px` against
 * {@link ROOT_FONT_SIZE_PX}.
 *
 * The DOCX target always resolves `rem` against that constant, but a browser
 * resolves it against the root element of whatever page the document is shown
 * in, so a host with `html { font-size: 20px }` would scale a preview and
 * nothing else. Every length the library writes into the browser targets goes
 * through here, which is what keeps `1rem` meaning the same thing everywhere.
 *
 * @example
 * resolveRemLengths('calc(100% - 2rem)'); // 'calc(100% - 32px)'
 * resolveRemLengths('var(--gap, 0.5rem)'); // 'var(--gap, 8px)'
 */
export const resolveRemLengths = (value: string): string =>
  value.replace(
    REM_LENGTH_EXP,
    (_match, unchanged: undefined | string, amount: string) =>
      unchanged ?? `${remToPx(Number.parseFloat(amount))}px`,
  );

/**
 * {@link resolveRemLengths} for a single typed length, keeping its type.
 *
 * @example
 * resolveRemSize('2rem'); // '32px'
 * resolveRemSize('1in'); // '1in'
 */
export const resolveRemSize = (value: UnitsSize): UnitsSize => {
  const [amount, units] = parseUnitsSize(value);
  return units === 'rem' ? toUnits(remToPx(amount), 'px') : value;
};
