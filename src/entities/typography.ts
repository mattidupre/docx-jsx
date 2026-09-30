import { mapValues, merge } from 'lodash';
import { type AssertObjectHasKeys, assignDefined } from '../utils/object';
import { toDefinedArray } from '../utils/array';
import type { FontFamily } from './fonts';
import type { TagName } from './html';
import type { Color } from './options';
import { ROOT_FONT_SIZE_PX, type UnitsSize, type UnitsUnitless } from './units';

export const TYPOGRAPHY_CSS_KEYS = [
  'breakInside',
  'breakAfter',
  'textAlign',
  'lineHeight',
  'fontWeight',
  'fontStyle',
  'fontSize',
  'fontFamily',
  'color',
  'textTransform',
  'textDecoration',
  'textIndent',
  'marginTop',
  'marginRight',
  'marginBottom',
  'paddingBottom',
  'borderBottomWidth',
  'borderBottomColor',
  'marginLeft',
  'whiteSpace',
] as const;

export type TypographyCssKey = (typeof TYPOGRAPHY_CSS_KEYS)[number];

type TypographyOptionsCssFlat = AssertObjectHasKeys<
  {
    breakInside: 'auto' | 'avoid';
    breakAfter: 'auto' | 'avoid';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    // CSS `line-height`: `normal` (font-dependent), a unitless multiplier of
    // the font size, or an absolute length.
    lineHeight: 'normal' | UnitsUnitless | UnitsSize;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    fontSize: 'normal' | UnitsSize;
    fontFamily: undefined | FontFamily;
    color: Color | 'currentColor';
    textTransform: 'none' | 'uppercase';
    textDecoration: 'none' | 'underline' | 'line-through';
    textIndent: UnitsSize;
    marginTop: UnitsSize;
    marginRight: UnitsSize;
    marginBottom: UnitsSize;
    paddingBottom: UnitsSize;
    borderBottomWidth: UnitsSize;
    borderBottomColor: Color | 'currentColor';
    marginLeft: UnitsSize;
    // CSS `white-space`: `pre` keeps both the spaces and the newlines of the
    // source, which is what a `<pre>` means and what the DOCX target reproduces
    // with non-breaking spaces and explicit breaks.
    whiteSpace: 'normal' | 'nowrap' | 'pre';
  },
  TypographyCssKey
>;

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
  [K in keyof T]?: undefined | T[K] | ReadonlyArray<undefined | string>;
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
 * The heading scale every browser ships in its user agent stylesheet, as
 * multiples of the inherited font size (`font-size`) and of the heading's own
 * font size (`margin-block`).
 *
 * Word has no cascade and no `em`, so the two targets can only agree if the
 * scale is resolved once, here, against {@link ROOT_FONT_SIZE_PX}. The library
 * also overrides the user agent defaults itself (`lib/styles.ts` gives every
 * element a `font-size` and every paragraph tag a `margin`), so relying on the
 * browser's own copy of this table is not an option either.
 */
const INTRINSIC_HEADING_SCALE = {
  h1: { fontSizeEm: 2, marginEm: 0.67 },
  h2: { fontSizeEm: 1.5, marginEm: 0.83 },
  h3: { fontSizeEm: 1.17, marginEm: 1 },
  h4: { fontSizeEm: 1, marginEm: 1.33 },
  h5: { fontSizeEm: 0.83, marginEm: 1.67 },
  h6: { fontSizeEm: 0.67, marginEm: 2.33 },
} as const satisfies Partial<
  Record<TagName, { fontSizeEm: number; marginEm: number }>
>;

/**
 * Lengths are compared as strings in snapshots and written into OOXML as whole
 * half-points and twips, so a scale value is rounded once rather than carrying
 * binary floating point noise into every target.
 */
const SUB_PIXEL_DIGITS = 2;

const toPx = (value: number): UnitsSize =>
  `${Number(value.toFixed(SUB_PIXEL_DIGITS))}px`;

/**
 * The intrinsic typography of `h1`..`h6`, in absolute lengths.
 *
 * These reach the browser as the CSS custom properties of a tag rule
 * (`lib/styles.ts`) and Word as the run and paragraph properties of the
 * built-in `Heading1`..`Heading6` styles (`parsers/docx/variantsToDocx.ts`).
 * Both are the lowest priority source in their target, so a variant or an
 * inline typography option still overrides them.
 */
export const INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS: Partial<
  Record<TagName, TypographyOptions>
> = mapValues(
  INTRINSIC_HEADING_SCALE,
  ({ fontSizeEm, marginEm }): TypographyOptions => {
    const fontSizePx = fontSizeEm * ROOT_FONT_SIZE_PX;
    // CSS resolves a margin `em` against the element's own font size.
    const marginPx = marginEm * fontSizePx;
    return {
      fontSize: toPx(fontSizePx),
      fontWeight: 'bold',
      marginTop: toPx(marginPx),
      marginBottom: toPx(marginPx),
    };
  },
);

/**
 * The generic family CSS resolves to whichever monospaced font the reader has.
 *
 * Word has no generic families: a `w:rFonts` names one installed font. This is
 * the monospaced face every Word installation ships, so `pre` and `code` are
 * set in a fixed pitch font in Word exactly as they are in a browser.
 */
export const MONOSPACE_FONT_FAMILY = 'monospace';

export const MONOSPACE_DOCX_FONT_NAME = 'Courier New';

/**
 * The `margin-block` every browser's user agent stylesheet gives a `blockquote`
 * and a `pre` (`1em`), and the `margin-inline` it gives a `blockquote`
 * (`40px`), resolved against {@link ROOT_FONT_SIZE_PX}.
 */
const BLOCK_MARGIN: UnitsSize = `${ROOT_FONT_SIZE_PX}px`;

const BLOCKQUOTE_INDENT: UnitsSize = '40px';

/**
 * The intrinsic typography of the tags whose meaning is typographic rather than
 * structural, in absolute lengths.
 *
 * The library's own `*` rule resets `font-family` and `white-space` to `unset`
 * on every element, so a browser's user agent defaults for these tags are gone
 * and have to be redeclared (`lib/styles.ts`); Word has no user agent
 * stylesheet at all and reads them as paragraph and run properties
 * (`parsers/docx/htmlToDocx.ts`). Declaring them once here is what keeps a
 * quote indented by the same 40px and a code block set in the same fixed pitch
 * font in every target.
 */
export const INTRINSIC_TAG_TYPOGRAPHY_OPTIONS = {
  blockquote: {
    marginTop: BLOCK_MARGIN,
    marginBottom: BLOCK_MARGIN,
    marginLeft: BLOCKQUOTE_INDENT,
    marginRight: BLOCKQUOTE_INDENT,
  },
  pre: {
    fontFamily: MONOSPACE_FONT_FAMILY,
    whiteSpace: 'pre',
    marginTop: BLOCK_MARGIN,
    marginBottom: BLOCK_MARGIN,
  },
  code: {
    fontFamily: MONOSPACE_FONT_FAMILY,
  },
} as const satisfies Partial<Record<TagName, TypographyOptions>>;

/**
 * The tags of {@link INTRINSIC_TAG_TYPOGRAPHY_OPTIONS} that lay out as a block
 * box but are not paragraphs.
 *
 * A `blockquote` holds paragraphs rather than being one, so it is absent from
 * `PARAGRAPH_TAG_NAMES` -- and therefore from the rule that lets the margin
 * custom properties reach an element at all. `pre` is a paragraph and needs no
 * entry here; `code` is inline and must not get one.
 */
export const INTRINSIC_BLOCK_TAG_NAMES = [
  'blockquote',
] as const satisfies ReadonlyArray<keyof typeof INTRINSIC_TAG_TYPOGRAPHY_OPTIONS>;

/**
 * Map certain HTML tags to their respective typography styles.
 * Creates consistency between HTML and Docx: the DOCX mapper applies these as
 * run properties and `lib/styles.ts` generates the browser's tag rules from
 * the same entries.
 *
 * Headings are deliberately absent: their scale is registered as a style
 * (Word) and as a tag rule (CSS) instead, because everything in this map is
 * applied to a run as direct formatting in DOCX and direct formatting would
 * win over a variant the author asked for.
 */
export const INTRINSIC_TYPOGRAPHY_OPTIONS = {
  b: { fontWeight: 'bold' },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  i: { fontStyle: 'italic' },
  u: { textDecoration: 'underline' },
  s: { textDecoration: 'line-through' },
  sup: { superScript: true },
  sub: { subScript: true },
} as const satisfies Partial<Record<TagName, TypographyOptions>>;

export type VariantName = string;

export type Variants = Record<VariantName, TypographyOptions>;

export type Variant = TypographyOptions;

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
