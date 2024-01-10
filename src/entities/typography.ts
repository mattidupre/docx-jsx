import { mapValues, merge } from 'lodash';
import { assignDefined } from '../utils/object';
import { toDefinedArray } from '../utils/array';
import type { FontFamily } from './fonts';
import type { TagName } from './html';
import type { Color } from './options';
import type { UnitsPx, UnitsRem } from './units';

type TypographyOptionsCssFlat = {
  breakInside: 'auto' | 'avoid';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: UnitsRem;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  fontSize: 'normal' | UnitsRem;
  fontFamily: FontFamily;
  color: Color | 'currentColor';
  textTransform: 'none' | 'uppercase';
  textDecoration: 'none' | 'underline' | 'line-through';
  textIndent: UnitsPx | UnitsRem;
  marginTop: UnitsPx | UnitsRem;
  marginBottom: UnitsPx | UnitsRem;
  paddingBottom: UnitsPx | UnitsRem;
  borderBottomWidth: UnitsPx | UnitsRem;
  borderBottomColor: Color | 'currentColor';
  marginLeft: UnitsPx | UnitsRem;
};

const DEFAULT_TYPOGRAPHY_CSS_OPTIONS: Required<TypographyOptionsCssFlat> = {
  breakInside: 'auto',
  textAlign: 'left',
  lineHeight: '1.5rem',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontSize: 'normal',
  fontFamily: 'initial', // TODO: How to handle this with Docx?
  color: '#000000',
  textTransform: 'none',
  textDecoration: 'none',
  textIndent: '0px',
  marginTop: '0px',
  marginBottom: '0px',
  paddingBottom: '0px',
  borderBottomWidth: '0px',
  borderBottomColor: 'currentColor',
  marginLeft: '0px',
};

export const TYPOGRAPHY_CSS_KEYS = Object.keys(
  DEFAULT_TYPOGRAPHY_CSS_OPTIONS,
) as ReadonlyArray<keyof typeof DEFAULT_TYPOGRAPHY_CSS_OPTIONS>;

export type TypographyCssKey = (typeof TYPOGRAPHY_CSS_KEYS)[number];

type TypographyOptionsCustomFlat = {
  highlightColor: Color;
  superScript: boolean;
  subScript: boolean;
};

// const DEFAULT_TYPOGRAPHY_CUSTOM_OPTIONS: Required<TypographyOptionsCustomFlat> =
//   {
//     highlightColor: '#ffff00',
//     superScript: false, // TODO: Infer these in Docx based on parentTags.
//     subScript: false, // TODO: Infer these in Docx based on parentTags.
//   };

export type TypographyOptionsFlat = TypographyOptionsCssFlat &
  TypographyOptionsCustomFlat;

type TypographyOptionsFromFlat<T extends TypographyOptionsFlat> = {
  [K in keyof T]?: undefined | T[K] | [...ReadonlyArray<undefined | string>];
};

/**
 * Unified config based on CSS but that can be applied to other document types.
 */
export type TypographyOptions =
  TypographyOptionsFromFlat<TypographyOptionsFlat>;

export const typographyOptionsToFlat = <TOptions extends TypographyOptions>(
  options: TOptions,
) =>
  mapValues(options, (value) =>
    toDefinedArray(value).pop(),
  ) as TOptions extends TypographyOptionsFromFlat<infer T> ? T : never;

// export const DEFAULT_TYPOGRAPHY_OPTIONS: Required<TypographyOptions> = {
//   ...DEFAULT_TYPOGRAPHY_CSS_OPTIONS,
//   ...DEFAULT_TYPOGRAPHY_CUSTOM_OPTIONS,
// };

/**
 * Overwrites typography config values onto the first value.
 */
export const assignTypographyOptions = (
  ...[args0, ...args]: ReadonlyArray<undefined | TypographyOptions>
): TypographyOptions => assignDefined(args0 ?? {}, ...args);

/**
 * Map certain HTML tags to their respective typography styles.
 * Creates consistency between HTML and Docx.
 */
export const INTRINSIC_TYPOGRAPHY_OPTIONS = {
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  s: { textDecoration: 'line-through' },
  sup: { superScript: true },
  sub: { subScript: true },
} as const satisfies Partial<Record<TagName, TypographyOptions>>;

export type VariantName = string;

export type Variants = Record<VariantName, TypographyOptions>;

export const assignVariants = <T extends Variants>(
  ...[args0, ...args]: ReadonlyArray<undefined | Partial<T>>
) => merge(args0 ?? {}, ...args) as T;

export const INTRINSIC_VARIANT_TAG_NAMES = {
  // 'document': '*',
  title: 'h1',
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
  heading5: 'h5',
  heading6: 'h6',
  strong: 'strong',
  listParagraph: 'li',
  hyperlink: 'a',
} as const satisfies Partial<Record<VariantName, TagName>>;
