import type { IStylesOptions } from 'docx';
import { startCase } from 'lodash';
import type { ArrayValues, Writable } from 'type-fest';
import type { Variants, FontsConfig, VariantName } from '../../entities';
import { isValueInArray } from '../../utils/array';
import {
  parseParagraphOptions,
  parseTextRunOptions,
} from './typographyOptionsToDocx';

export const variantNameToParagraphStyleId = (
  variantName: undefined | VariantName,
) => variantName;

export const variantNameToCharacterStyleId = (
  variantName: undefined | VariantName,
) => variantName && `${variantName} Text`;

type DefaultStyles = Writable<NonNullable<IStylesOptions['default']>>;

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
  fonts: FontsConfig,
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
