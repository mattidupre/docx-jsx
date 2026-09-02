import { kebabCase, mapValues, pick } from 'lodash';
import {
  TYPOGRAPHY_CSS_KEYS,
  type Variants,
  INTRINSIC_BLOCK_TAG_NAMES,
  INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS,
  INTRINSIC_VARIANT_TAG_NAMES,
  type DocumentType,
  type ElementType,
  type FontsConfig,
  type PrefixesConfig,
  type TypographyOptions,
  type VariantName,
  getFontFaceSource,
  PARAGRAPH_TAG_NAMES,
} from '../entities';
import { getValueOf } from '../utils/object';
import { joinKebab, prefixKebab } from '../utils/string';
import {
  type CssRulesArray,
  cssRulesArrayToString,
  type CssRuleDeclarations,
  type CssVarName,
  objectToVarValues,
} from '../utils/css';

/**
 * The class every library element carries in the DOM and PDF targets, e.g.
 * `matti-docs-element-grid-container`. The library styles nothing through it:
 * it exists so a consumer's own stylesheet can reach an element the library
 * rendered without depending on the tag it happened to choose.
 *
 * @example
 * elementTypeToClassName({ prefixes }, 'gridItem');
 * // 'matti-docs-element-grid-item'
 */
export const elementTypeToClassName = (
  { prefixes }: { prefixes: Pick<PrefixesConfig, 'elementClassName'> },
  elementType: ElementType,
) => prefixKebab(prefixes.elementClassName, elementType);

export const variantNameToClassName = (
  { prefixes }: { prefixes: Pick<PrefixesConfig, 'variantClassName'> },
  variantName: VariantName,
) => prefixKebab(prefixes.variantClassName, variantName);

export const typographyOptionsToStyleVars = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  typographyOptions: undefined | TypographyOptions,
) =>
  objectToVarValues(pick(typographyOptions, ...TYPOGRAPHY_CSS_KEYS), {
    prefix: options.prefixes.cssVariable,
  });

export const variantsToStyleVars = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  variants: Partial<Variants>,
) =>
  objectToVarValues(variants, {
    prefix: options.prefixes.cssVariable,
  });

const createPrefixedVarName = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  value: string | number,
): CssVarName => `--${joinKebab(options.prefixes.cssVariable, String(value))}`;

const createPrefixedVar = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  value: string | number,
  defaultValue?: string | number,
) =>
  `var(${createPrefixedVarName(options, value)}${
    defaultValue !== undefined ? `, ${defaultValue}` : ''
  })`;

const DEFAULT_VARS: CssRuleDeclarations = {
  fontSize: '1rem',
  borderWidth: 0,
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
};

const DIRECT_PARAGRAPH_STYLES = {
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
} as const satisfies Partial<Record<keyof TypographyOptions, unknown>>;

/**
 * Box decoration and box spacing belong to the element that declared them.
 * Custom properties inherit even though the CSS properties they feed do not, so
 * without a reset the `*` rule below would draw a variant's underline again
 * around every nested `<span>`, `<b>` or `<em>`, and would indent the
 * paragraphs inside a `<blockquote>` by the quote's own inset a second time.
 * Resetting the variable in `*` makes it self-only: a declaration that wins
 * over `*` (an inline style, an intrinsic tag rule, or a variant rule later in
 * this sheet) styles just its own element, and descendants fall back to the
 * default.
 */
const SELF_STYLE_KEYS = [
  'paddingBottom',
  'borderBottomWidth',
  'borderBottomColor',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
] as const satisfies ReadonlyArray<keyof TypographyOptions>;

/**
 * The selector an intrinsic variant styles where the bare tag of
 * `INTRINSIC_VARIANT_TAG_NAMES` would style more than the variant means.
 *
 * `hyperlink` styles links, and an `<a>` with no `href` is an anchor target
 * rather than a link: browsers do not style one as a link, and the DOCX target
 * only applies Word's `Hyperlink` character style inside an `<a href>`. Without
 * the attribute selector a `Bookmark` would be coloured in HTML and PDF and
 * left plain in Word.
 */
const INTRINSIC_VARIANT_SELECTORS = {
  hyperlink: 'a[href]',
} as const satisfies Partial<Record<VariantName, string>>;

export type FontFaceStringOptions = {
  fonts?: FontsConfig;
  documentType: DocumentType;
};

/**
 * The `@font-face` rules for every configured font that has a source for
 * `documentType`. `@font-face` is ignored inside a shadow root, so these rules
 * belong on the document itself rather than in the page stylesheet built by
 * {@link createStyleString}.
 */
export const createFontFaceString = ({
  fonts,
  documentType,
}: FontFaceStringOptions): string => {
  if (!fonts || documentType === 'docx') {
    return '';
  }

  const rules: Array<string> = [];

  for (const fontFamily of Object.keys(fonts)) {
    for (const fontFace of fonts[fontFamily].fontFaces) {
      const source = getFontFaceSource(fontFace, documentType);
      if (!source) {
        console.error(
          `Could not find a ${documentType} font face for ${fontFamily}`,
        );
        continue;
      }
      const declarations = [
        `font-family: ${JSON.stringify(fontFamily)};`,
        `src: url(${JSON.stringify(source.src)}) format(${JSON.stringify(
          source.format,
        )});`,
        fontFace.fontWeight === undefined
          ? undefined
          : `font-weight: ${fontFace.fontWeight};`,
        fontFace.fontStyle === undefined
          ? undefined
          : `font-style: ${fontFace.fontStyle};`,
      ].filter(Boolean);
      rules.push(`@font-face {\n  ${declarations.join('\n  ')}\n}`);
    }
  }

  return rules.join('\n');
};

export const createStyleArray = (options: {
  variants?: Variants;
  prefixes: Pick<PrefixesConfig, 'cssVariable' | 'variantClassName'>;
}): CssRulesArray => {
  const { prefixes, variants = {} } = options;

  // TODO: How to handle highlight, <sup>, <sub>?
  const rules: CssRulesArray = [];

  rules.push([
    '*',
    {
      borderWidth: 0,
      borderStyle: 'solid',
      ...SELF_STYLE_KEYS.reduce(
        (declarations, property) => ({
          ...declarations,
          [createPrefixedVarName(options, property)]: 'initial',
        }),
        {} as CssRuleDeclarations,
      ),
      ...TYPOGRAPHY_CSS_KEYS.reduce((declarations, property) => {
        if (property in DIRECT_PARAGRAPH_STYLES) {
          return declarations;
        }
        return {
          ...declarations,
          [kebabCase(property)]: createPrefixedVar(
            options,
            property,
            DEFAULT_VARS[property] ?? 'unset',
          ),
        };
      }, {} as CssRuleDeclarations),
    },
  ]);

  rules.push(
    [
      ':where(b, strong)',
      {
        fontWeight: 'bold',
      },
    ],
    [
      ':where(em, i)',
      {
        fontStyle: 'italic',
      },
    ],
    [
      ':where(u)',
      {
        textDecoration: 'underline',
      },
    ],
    [
      ':where(s)',
      {
        textDecoration: 'line-through',
      },
    ],
  );

  rules.push(
    [
      // `blockquote` is not a paragraph -- it holds them -- but it owns a
      // margin box of its own, so it needs the same custom properties for the
      // intrinsic rule below (and an author's variant) to reach it.
      `:where(${[...PARAGRAPH_TAG_NAMES, ...INTRINSIC_BLOCK_TAG_NAMES].join(
        ', ',
      )})`,
      {
        ...mapValues(DIRECT_PARAGRAPH_STYLES, (value, key) =>
          createPrefixedVar(options, key, value),
        ),
        display: 'flow-root', // Prevents margin collapse
      },
    ],
    [
      `:where(li)`,
      {
        display: 'list-item', // Fixes flow-root
      },
    ],
  );

  // The library's own `*` and paragraph rules override the user agent's
  // heading sizes and margins, so the scale is declared here instead -- as the
  // same variables a variant sets, from the same table the DOCX heading styles
  // are built from. These rules come before the variant rules and every
  // selector is `:where()`, so a variant on a heading still wins.
  for (const tagName in INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS) {
    rules.push([
      `:where(${tagName})`,
      typographyOptionsToStyleVars(
        { prefixes },
        getValueOf(INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS, tagName),
      ),
    ]);
  }

  // The same reset that removed the user agent's heading sizes also removed
  // the monospaced font of `pre`/`code`, the preserved whitespace of `pre` and
  // the margins of `blockquote`. They are declared here from the one table the
  // DOCX mapper reads them from, so both targets indent a quote and set code in
  // a fixed pitch font the same way.
  for (const tagName in INTRINSIC_TAG_TYPOGRAPHY_OPTIONS) {
    rules.push([
      `:where(${tagName})`,
      typographyOptionsToStyleVars(
        { prefixes },
        getValueOf(INTRINSIC_TAG_TYPOGRAPHY_OPTIONS, tagName),
      ),
    ]);
  }

  // Variant vars are attached to variant class names .[prefix]-[variant-name]
  for (const variantName in variants) {
    const intrinsicSelector =
      getValueOf(INTRINSIC_VARIANT_SELECTORS, variantName) ??
      getValueOf(INTRINSIC_VARIANT_TAG_NAMES, variantName);

    const variantSelectors = [
      `:where(.${variantNameToClassName({ prefixes }, variantName)})`,
      intrinsicSelector ? `:where(${intrinsicSelector})` : [],
    ].flat();

    const variantSelectorSelf = variantSelectors.join(', ');

    rules.push([
      // Variant tags set variant CSS vars.
      variantSelectorSelf,
      typographyOptionsToStyleVars({ prefixes }, variants[variantName]),
    ]);
  }

  return rules;
};

export const createStyleString = (
  ...args: Parameters<typeof createStyleArray>
) => cssRulesArrayToString(createStyleArray(...args));
