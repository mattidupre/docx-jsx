import type { CSSProperties } from 'react';
import { mapKeys, mapValues } from 'lodash';
import { assignDefined, joinNestedKeys } from '../utils/object';
import type { TagName } from './html';
import type { Color } from './options';

type TypographyCssOptions = {
  breakInside: 'auto' | 'avoid';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: `${number}`;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  fontSize: 'normal' | `${number}rem`;
  fontFamily: string;
  color: Color;
  textTransform: 'none' | 'uppercase';
  textDecoration: 'none' | 'underline' | 'line-through';
};

const DEFAULT_TYPOGRAPHY_CSS_OPTIONS: Required<TypographyCssOptions> = {
  breakInside: 'auto',
  textAlign: 'left',
  lineHeight: '1',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontSize: 'normal',
  fontFamily: 'initial', // TODO: How to handle this with Docx?
  color: '#000000',
  textTransform: 'none',
  textDecoration: 'none',
};

export const TYPOGRAPHY_CSS_KEYS = Object.keys(
  DEFAULT_TYPOGRAPHY_CSS_OPTIONS,
) as ReadonlyArray<keyof typeof DEFAULT_TYPOGRAPHY_CSS_OPTIONS>;

type TypographyCustomOptions = {
  highlightColor: Color;
  superScript: boolean;
  subScript: boolean;
};

const DEFAULT_TYPOGRAPHY_CUSTOM_OPTIONS: Required<TypographyCustomOptions> = {
  highlightColor: '#ffff00',
  superScript: false, // TODO: Infer these in Docx based on parentTags.
  subScript: false, // TODO: Infer these in Docx based on parentTags.
};

/**
 * Unified config based on CSS but that can be applied to other document types.
 */
export type TypographyOptions = Partial<
  TypographyCssOptions & TypographyCustomOptions
>;

export const DEFAULT_TYPOGRAPHY_OPTIONS: Required<TypographyOptions> = {
  ...DEFAULT_TYPOGRAPHY_CSS_OPTIONS,
  ...DEFAULT_TYPOGRAPHY_CUSTOM_OPTIONS,
};

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

export type VariantValues = {
  [K in keyof TypographyOptions]:
    | undefined
    | TypographyOptions[K]
    | [...ReadonlyArray<undefined | `--${string}`>, TypographyOptions[K]];
};

export type Variants = Record<VariantName, VariantValues>;

/**
 * Overwrites all variant values onto the first variant value.
 */
export const assignVariantValue = (
  ...[args0, ...args]: ReadonlyArray<undefined | VariantValues>
): VariantValues => assignDefined(args0 ?? {}, ...args);

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

// TODO: Move to htmlToDocx
// /**
//  * If any variant values are an array, grab the last (fallback) value.
//  * This is not the same as the document defaults.
//  * Allows variant values to be declared first as CSS variables, then fall back
//  * to hard-coded values.
//  */
// export const variantValuesToDefaults = (variantValues: VariantValues) =>
//   mapValues(variantValues, (typographyOption) =>
//     Array.isArray(typographyOption)
//       ? typographyOption[typographyOption.length - 1]
//       : typographyOption,
//   ) as TypographyOptions;
