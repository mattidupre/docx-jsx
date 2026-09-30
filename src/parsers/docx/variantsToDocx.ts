import { HeadingLevel, type IStylesOptions } from 'docx';
import { startCase } from 'lodash';
import type { ArrayValues, Writable } from 'type-fest';
import {
  type DefaultTypography,
  type Variants,
  type FontsConfig,
  type VariantName,
  type Variant,
  type TypographyOptions,
  assignTypographyOptions,
  resolveLineBox,
  resolveLineBoxFont,
  INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
  INTRINSIC_VARIANT_TAG_NAMES,
} from '../../entities';
import { getValueOf, isKeyOf } from '../../utils/object';
import {
  parseLineSpacing,
  parseParagraphOptions,
  parseTextRunOptions,
} from './typographyOptionsToDocx';

type DefaultStyles = Writable<NonNullable<IStylesOptions['default']>>;

/**
 * Variants that Word already knows about as paragraph styles. Mapping onto the
 * built-in style ids is what makes the navigation pane, the outline view and
 * generated tables of contents pick headings up; a custom style id would be
 * styled correctly but invisible to all three. `docx` writes these styles into
 * `word/styles.xml` for every document, so the ids always resolve.
 */
const INTRINSIC_PARAGRAPH_STYLE_IDS = {
  // document: ...,
  // title: 'Title',
  heading1: HeadingLevel.HEADING_1,
  heading2: HeadingLevel.HEADING_2,
  heading3: HeadingLevel.HEADING_3,
  heading4: HeadingLevel.HEADING_4,
  heading5: HeadingLevel.HEADING_5,
  heading6: HeadingLevel.HEADING_6,
  // strong: 'Strong',
  listParagraph: 'ListParagraph',
} as const satisfies Partial<Record<keyof DefaultStyles, string>>;

/**
 * Variants Word already knows about as character styles.
 */
const INTRINSIC_CHARACTER_STYLE_IDS = {
  hyperlink: 'Hyperlink',
  // footnoteReference: 'FootnoteReference',
  // footnoteTextChar: 'FootnoteTextChar',
} as const satisfies Partial<Record<keyof DefaultStyles, string>>;

const STYLE_ID_ESCAPE = 'X';

const STYLE_ID_ESCAPED_EXP = new RegExp(`[^0-9A-Za-z]|${STYLE_ID_ESCAPE}`, 'g');

/**
 * Word style ids are single tokens: no spaces, no punctuation. Variant names
 * are arbitrary strings, so every character outside `[0-9A-Za-z]` is escaped as
 * `X` plus its four hex digit code unit, and a literal `X` is escaped as `XX`.
 *
 * The encoding is reversible, so two different variant names can never produce
 * the same id, and it depends on nothing but the name, so an id never shifts
 * when other variants are added or removed. The human readable name is kept on
 * the style's `name`, which is what Word shows in its UI.
 *
 * @example
 * variantNameToStyleId('mockParagraphVariant'); // 'mockParagraphVariant'
 * variantNameToStyleId('Job Title'); // 'JobX0020Title'
 */
const variantNameToStyleId = (variantName: VariantName) =>
  variantName.replace(STYLE_ID_ESCAPED_EXP, (char) =>
    char === STYLE_ID_ESCAPE
      ? `${STYLE_ID_ESCAPE}${STYLE_ID_ESCAPE}`
      : `${STYLE_ID_ESCAPE}${char
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')}`,
  );

/**
 * The id of the paragraph style a variant registers, or undefined when the
 * variant only exists as a character style (its formatting still reaches the
 * paragraph through the character style on its runs).
 */
export const variantNameToParagraphStyleId = (
  variantName: undefined | VariantName,
): undefined | string => {
  if (!variantName) {
    return undefined;
  }
  if (isKeyOf(variantName, INTRINSIC_PARAGRAPH_STYLE_IDS)) {
    return INTRINSIC_PARAGRAPH_STYLE_IDS[variantName];
  }
  if (isKeyOf(variantName, INTRINSIC_CHARACTER_STYLE_IDS)) {
    return undefined;
  }
  return variantNameToStyleId(variantName);
};

/**
 * The id of the character style a variant registers. Every paragraph style is
 * registered together with a linked character style so the same variant can be
 * applied to an inline tag (`<span>`, `<b>`, …) as well as a block tag, which
 * is Word's own `Heading1` / `Heading1Char` convention.
 */
export const variantNameToCharacterStyleId = (
  variantName: undefined | VariantName,
): undefined | string => {
  if (!variantName) {
    return undefined;
  }
  if (isKeyOf(variantName, INTRINSIC_CHARACTER_STYLE_IDS)) {
    return INTRINSIC_CHARACTER_STYLE_IDS[variantName];
  }
  return `${variantNameToParagraphStyleId(variantName)}Char`;
};

/**
 * A variant's declarations over the intrinsic typography of the tag it styles.
 *
 * `Heading2` is what a plain `<h2>` resolves to in Word, so the heading scale
 * has to live on that style for the DOCX to size headings the way the CSS side
 * does. The user's variant is assigned last and so still wins, exactly as its
 * later rule wins in the stylesheet.
 */
const variantWithIntrinsicTypography = (
  variantName: VariantName,
  variant: undefined | Variant,
): undefined | Variant => {
  const intrinsicTypography = getValueOf(
    INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
    getValueOf(INTRINSIC_VARIANT_TAG_NAMES, variantName),
  );
  if (!intrinsicTypography) {
    return variant;
  }
  return assignTypographyOptions({}, intrinsicTypography, variant);
};

/**
 * The paragraph properties of a style or of the document defaults: those of
 * `typography`, with the exact line the typography resolves to over the
 * document's defaults. A style only carries a line height; trimming is
 * compensated paragraph by paragraph, so it is left out here.
 */
const parseStyleParagraphOptions = (
  fonts: FontsConfig,
  typography: undefined | TypographyOptions,
  defaultTypography: undefined | DefaultTypography,
) => {
  const paragraphOptions = parseParagraphOptions(fonts, typography);
  const resolved = assignTypographyOptions({}, defaultTypography, typography, {
    textBoxTrim: 'none',
  });
  const lineBox = resolveLineBox(resolved, resolveLineBoxFont(fonts, resolved));
  if (!lineBox) {
    return paragraphOptions;
  }
  return {
    ...paragraphOptions,
    spacing: {
      ...paragraphOptions?.spacing,
      ...parseLineSpacing(lineBox, { atLeast: false }),
    },
  };
};

export const parseVariants = (
  fonts: FontsConfig,
  variants: Variants,
  defaultTypography?: DefaultTypography,
): IStylesOptions => {
  const defaultStyles: DefaultStyles = {};
  const paragraphStyles: Array<
    ArrayValues<NonNullable<IStylesOptions['paragraphStyles']>>
  > = [];
  const characterStyles: Array<
    ArrayValues<NonNullable<IStylesOptions['characterStyles']>>
  > = [];

  // Style ids share one namespace in word/styles.xml, so a duplicate would
  // silently reassign a variant's formatting to another variant.
  const variantNamesByStyleId = new Map<string, VariantName>();
  const claimStyleId = (styleId: string, variantName: VariantName) => {
    const claimedBy = variantNamesByStyleId.get(styleId);
    if (claimedBy !== undefined) {
      throw new TypeError(
        `Variants "${claimedBy}" and "${variantName}" both map to style id "${styleId}".`,
      );
    }
    variantNamesByStyleId.set(styleId, variantName);
    return styleId;
  };

  for (const variantName of new Set([
    ...Object.keys(INTRINSIC_PARAGRAPH_STYLE_IDS),
    ...Object.keys(INTRINSIC_CHARACTER_STYLE_IDS),
    ...Object.keys(variants),
  ])) {
    if (!variantName) {
      throw new TypeError('Variant names cannot be empty.');
    }

    const variant = variantWithIntrinsicTypography(
      variantName,
      variants[variantName],
    );
    const styleName = startCase(variantName);
    const paragraphStyleId = variantNameToParagraphStyleId(variantName);
    const characterStyleId = variantNameToCharacterStyleId(variantName)!;

    if (isKeyOf(variantName, INTRINSIC_PARAGRAPH_STYLE_IDS)) {
      claimStyleId(paragraphStyleId!, variantName);
      // `docx` names and registers the built-in paragraph style itself; only
      // its linked character style has to be declared here.
      defaultStyles[variantName] = {
        link: characterStyleId,
        paragraph:
          parseStyleParagraphOptions(fonts, variant, defaultTypography) ?? {},
        run: parseTextRunOptions(fonts, variant, defaultTypography) ?? {},
      };
      characterStyles.push({
        id: claimStyleId(characterStyleId, variantName),
        name: `${styleName} Char`,
        link: paragraphStyleId,
        quickFormat: true,
        run: parseTextRunOptions(fonts, variant, defaultTypography),
      });
    } else if (isKeyOf(variantName, INTRINSIC_CHARACTER_STYLE_IDS)) {
      claimStyleId(characterStyleId, variantName);
      defaultStyles[variantName] = {
        run: parseTextRunOptions(fonts, variant, defaultTypography) ?? {},
      };
    } else {
      paragraphStyles.push({
        id: claimStyleId(paragraphStyleId!, variantName),
        name: styleName,
        link: characterStyleId,
        quickFormat: true,
        paragraph: parseStyleParagraphOptions(
          fonts,
          variant,
          defaultTypography,
        ),
        run: parseTextRunOptions(fonts, variant, defaultTypography),
      });
      characterStyles.push({
        id: claimStyleId(characterStyleId, variantName),
        name: `${styleName} Char`,
        link: paragraphStyleId,
        quickFormat: true,
        run: parseTextRunOptions(fonts, variant, defaultTypography),
      });
    }
  }

  if (defaultTypography) {
    // `w:docDefaults`: what Word gives text no style or run formats, which is
    // what the CSS targets give it from the content root.
    defaultStyles.document = {
      run: parseTextRunOptions(fonts, defaultTypography) ?? {},
      paragraph:
        parseStyleParagraphOptions(fonts, undefined, defaultTypography) ?? {},
    };
  }

  return {
    default: defaultStyles,
    characterStyles,
    paragraphStyles,
  };
};
