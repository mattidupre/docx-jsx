import {
  AlignmentType,
  HeadingLevel,
  type IParagraphOptions,
  type IRunOptions,
  type IStylesOptions,
} from 'docx';
import { pick, startCase } from 'lodash';
import type { ArrayValues, Writable } from 'type-fest';
import {
  type Color,
  type Variants,
  type TypographyOptions,
  type TypographyOptionsFlat,
  typographyOptionsToFlat,
  getFontFace,
  type FontsOptions,
  type FontFace,
  type VariantName,
} from '../../entities';
import { isValueInArray } from '../../utils/array';
import { objectValuesDefined } from '../../utils/object';

type DefaultStyles = Writable<NonNullable<IStylesOptions['default']>>;

export const variantNameToParagraphStyleId = (
  variantName: undefined | VariantName,
) => variantName;

export const variantNameToCharacterStyleId = (
  variantName: undefined | VariantName,
) => variantName && `${variantName} Text`;

const parseColor = (color: undefined | 'currentColor' | Color) =>
  color && (color === 'currentColor' ? undefined : color.replace('#', ''));

const parseTextSize = (fontSize: TypographyOptionsFlat['fontSize']) =>
  fontSize !== undefined ? parseFloat(fontSize) * 22 : undefined;

// For now only support default docx font names
const parseFontFace = (fontFace: undefined | FontFace): undefined | string =>
  fontFace?.src;

const parseTypographyOptions = (
  fonts: FontsOptions,
  typographyOptions: TypographyOptions = {},
): IParagraphOptions & IRunOptions => {
  const typographyOptionsFlat = typographyOptionsToFlat(typographyOptions);

  const {
    textAlign,
    lineHeight,
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
  } = typographyOptionsFlat;

  return objectValuesDefined({
    font: parseFontFace(
      getFontFace(
        { fonts, documentType: 'docx' },
        { fontFamily, fontWeight, fontStyle },
      ),
    ),
    spacing: lineHeight && {
      line: lineHeight && parseFloat(lineHeight) * 240,
    },
    alignment: textAlign && DOCX_TEXT_ALIGN[textAlign],
    size: parseTextSize(fontSize),
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

export const DOCX_HEADING = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
} as const;

const DOCX_TEXT_ALIGN = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const DOCX_TEXT_RUN_OPTIONS_KEYS = [
  'size',
  'color',
  'shading',
  'bold',
  'italics',
  'allCaps',
  'underline',
  'strike',
  'superScript',
  'subScript',
  'font',
] as const satisfies ReadonlyArray<keyof IRunOptions>;

export const parseTextRunOptions = (
  fonts: FontsOptions,
  contentOptions: undefined | TypographyOptions,
): undefined | IRunOptions =>
  contentOptions && {
    ...pick(
      parseTypographyOptions(fonts, contentOptions),
      DOCX_TEXT_RUN_OPTIONS_KEYS,
    ),
  };

const DOCX_PARAGRAPH_OPTIONS_KEYS = [
  'spacing',
  'alignment',
] as const satisfies ReadonlyArray<keyof IParagraphOptions>;

export const parseParagraphOptions = (
  fonts: FontsOptions,
  contentOptions: undefined | TypographyOptions,
): undefined | IParagraphOptions =>
  contentOptions &&
  pick(
    parseTypographyOptions(fonts, contentOptions),
    DOCX_PARAGRAPH_OPTIONS_KEYS,
  );

const INTRINSIC_PARAGRAPH_VARIANT_NAMES = [
  // 'document',
  // 'title',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  // 'strong',
  'listParagraph',
] as const satisfies ReadonlyArray<keyof DefaultStyles>;

const INTRINSIC_TEXTRUN_VARIANT_NAMES = [
  'hyperlink',
  // 'footnoteReference',
  // 'footnoteText',
  // 'footnoteTextChar',
] as const satisfies ReadonlyArray<keyof DefaultStyles>;

export const parseVariants = (
  fonts: FontsOptions,
  variants: Variants,
): IStylesOptions => {
  const defaultStyles: Writable<NonNullable<IStylesOptions['default']>> = {};
  const paragraphStyles: Array<
    ArrayValues<NonNullable<IStylesOptions['paragraphStyles']>>
  > = [];
  const characterStyles: Array<
    ArrayValues<NonNullable<IStylesOptions['characterStyles']>>
  > = [];

  for (const variantName of new Set([
    ...INTRINSIC_PARAGRAPH_VARIANT_NAMES,
    ...INTRINSIC_TEXTRUN_VARIANT_NAMES,
    ...Object.keys(variants),
  ])) {
    const variant = variants[variantName];

    if (isValueInArray(variantName, INTRINSIC_PARAGRAPH_VARIANT_NAMES)) {
      defaultStyles[variantName] = {
        paragraph: parseParagraphOptions(fonts, variant) ?? {},
        run: parseTextRunOptions(fonts, variant) ?? {},
      };
    } else if (isValueInArray(variantName, INTRINSIC_TEXTRUN_VARIANT_NAMES)) {
      defaultStyles[variantName] = {
        run: parseTextRunOptions(fonts, variant) ?? {},
      };
    } else {
      paragraphStyles.push({
        id: variantNameToParagraphStyleId(variantName)!,
        name: startCase(variantName),
        quickFormat: true,
        paragraph: parseParagraphOptions(fonts, variant),
        run: parseTextRunOptions(fonts, variant),
      });
      characterStyles.push({
        id: variantNameToCharacterStyleId(variantName)!,
        name: startCase(variantName),
        quickFormat: true,
        run: parseTextRunOptions(fonts, variant),
      });
    }
  }

  return {
    default: defaultStyles,
    characterStyles,
    paragraphStyles,
  };
};
