import type { CSSProperties } from 'react';
import { kebabCase, mapValues, pick } from 'lodash';
import {
  TYPOGRAPHY_CSS_KEYS,
  INTRINSIC_TYPOGRAPHY_OPTIONS,
  ROOT_FONT_SIZE_PX,
  type Variants,
  INTRINSIC_BLOCK_TAG_NAMES,
  INTRINSIC_HEADING_TYPOGRAPHY_OPTIONS,
  INTRINSIC_TAG_TYPOGRAPHY_OPTIONS,
  INTRINSIC_VARIANT_TAG_NAMES,
  type DocumentType,
  type FontsConfig,
  type PrefixesConfig,
  type TypographyOptions,
  type VariantName,
  createTypographyVars,
  getFontFaceSource,
  PARAGRAPH_TAG_NAMES,
  resolveRemLengths,
  typographyOptionsToFlat,
  variantNameToClassName,
} from '../entities';
import { getValueOf } from '../utils/object';
import { isValueInArray } from '../utils/array';
import {
  type CssRulesArray,
  type CssRuleTuple,
  cssRulesArrayToString,
  type CssRuleDeclarations,
  toVarDeclaration,
} from '../utils/css';

/**
 * An inline style with every `rem` length resolved to `px`, for the same reason
 * {@link typographyOptionsToStyleVars} resolves them: the host page's root font
 * size must not reach into a document.
 */
export const resolveStyleRemLengths = <TValue>(
  style: Record<string, TValue>,
): Record<string, string | TValue> =>
  mapValues(style, (value) =>
    typeof value === 'string' ? resolveRemLengths(value) : value,
  );

/**
 * The custom properties that carry `typographyOptions` to the `*` rule of
 * {@link createStructuralStyleArray}. A fallback array becomes a `var()` chain,
 * and `rem` lengths are resolved here, including the literal at the end of the
 * chain, so a document keeps its sizes on a host page with a different root
 * font size.
 */
export const typographyOptionsToStyleVars = (
  options: {
    prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  },
  typographyOptions: undefined | TypographyOptions,
) =>
  createTypographyVars(options).encodeCssVars(
    mapValues(pick(typographyOptions, ...TYPOGRAPHY_CSS_KEYS), (value) => {
      const declaration = toVarDeclaration(value);
      return declaration && resolveRemLengths(declaration);
    }),
  );

const DEFAULT_VARS: CssRuleDeclarations = {
  fontSize: `${ROOT_FONT_SIZE_PX}px`,
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

/**
 * The declarations the browser needs for a tag of
 * {@link INTRINSIC_TYPOGRAPHY_OPTIONS}, which the DOCX mapper applies to the
 * same tag as run properties. Super- and subscript are not CSS keys, so they
 * are translated to the `vertical-align` a user agent would give the tag --
 * declared rather than inherited from the user agent, which a host page's reset
 * may have removed.
 */
const intrinsicTypographyToCss = (
  typographyOptions: TypographyOptions,
): CSSProperties => {
  const { superScript, subScript, ...cssOptions } =
    typographyOptionsToFlat(typographyOptions);
  return {
    ...pick(cssOptions, ...TYPOGRAPHY_CSS_KEYS),
    ...(superScript && { verticalAlign: 'super' }),
    ...(subScript && { verticalAlign: 'sub' }),
  };
};

/**
 * One `:where()` rule per distinct set of declarations, in table order, so
 * tags that mean the same thing (`b` and `strong`) share a rule.
 */
const createIntrinsicTagRules = (): CssRulesArray => {
  const rulesByCss = new Map<string, CssRuleTuple>();
  for (const tagName in INTRINSIC_TYPOGRAPHY_OPTIONS) {
    const css = intrinsicTypographyToCss(
      getValueOf(INTRINSIC_TYPOGRAPHY_OPTIONS, tagName) ?? {},
    );
    const key = JSON.stringify(css);
    const [selector] = rulesByCss.get(key) ?? [];
    rulesByCss.set(key, [
      selector ? `${selector.slice(0, -1)}, ${tagName})` : `:where(${tagName})`,
      css,
    ]);
  }
  return Array.from(rulesByCss.values());
};

/**
 * The rules every document shares: they depend on nothing but the CSS
 * variable prefix. The `*` rule reads each typography option from its custom
 * property, and the tag rules supply the intrinsic typography the DOCX mapper
 * reads from the same tables.
 */
export const createStructuralStyleArray = (options: {
  prefixes: Pick<PrefixesConfig, 'cssVariable'>;
}): CssRulesArray => {
  const { prefixes } = options;

  const typographyVars = createTypographyVars(options);

  const rules: CssRulesArray = [];

  rules.push([
    '*',
    {
      borderWidth: 0,
      borderStyle: 'solid',
      ...SELF_STYLE_KEYS.reduce(
        (declarations, property) => ({
          ...declarations,
          [typographyVars.var(property)]: 'initial',
        }),
        {} as CssRuleDeclarations,
      ),
      ...TYPOGRAPHY_CSS_KEYS.reduce((declarations, property) => {
        if (property in DIRECT_PARAGRAPH_STYLES) {
          return declarations;
        }
        return {
          ...declarations,
          [kebabCase(property)]: typographyVars.ref(
            property,
            DEFAULT_VARS[property] ?? 'unset',
          ),
        };
      }, {} as CssRuleDeclarations),
    },
  ]);

  rules.push(...createIntrinsicTagRules());

  rules.push(
    [
      // `blockquote` is not a paragraph -- it holds them -- but it owns a
      // margin box of its own, so it needs the same custom properties for the
      // intrinsic rule below (and an author's variant) to reach it.
      `:where(${[...PARAGRAPH_TAG_NAMES, ...INTRINSIC_BLOCK_TAG_NAMES].join(
        ', ',
      )})`,
      {
        ...Object.fromEntries(
          Object.entries(DIRECT_PARAGRAPH_STYLES).flatMap(([key, value]) =>
            isValueInArray(key, TYPOGRAPHY_CSS_KEYS)
              ? [[key, typographyVars.ref(key, value)]]
              : [],
          ),
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

  return rules;
};

/**
 * The rules that assign a document's variants. Variants are runtime data
 * declared on `DocumentProvider`, so this half holds nothing but custom
 * property assignments; the structural rules read them.
 */
export const createVariantStyleArray = (options: {
  variants?: Variants;
  prefixes: Pick<PrefixesConfig, 'cssVariable' | 'variantClassName'>;
}): CssRulesArray => {
  const { prefixes, variants = {} } = options;

  const rules: CssRulesArray = [];

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

/**
 * The structural rules followed by the variant rules: the variants have to
 * come later to win over the intrinsic tag rules at equal specificity.
 */
export const createStyleArray = (
  options: Parameters<typeof createVariantStyleArray>[0],
): CssRulesArray => [
  ...createStructuralStyleArray(options),
  ...createVariantStyleArray(options),
];

export const createStyleString = (
  ...args: Parameters<typeof createStyleArray>
) => cssRulesArrayToString(createStyleArray(...args));

/**
 * The content root starts from nothing a host page set: every property at its
 * initial value (and `direction`, which `all` excludes, at `ltr`), which for
 * the inherited ones (font, line height, colour,
 * letter spacing, text transform, widows and orphans...) is what a blank
 * page gives the document -- the page the PDF is printed from. Without it a
 * preview inherits whatever the application sets on `html` or `body`, a sans
 * serif, a 24px line height, a dark theme.
 *
 * `visibility` and `pointer-events` still inherit, so a hidden container
 * hides its pages. Paper is white whatever the application's background.
 *
 * The selector has no specificity, so a consumer's page class still wins.
 */
const CONTENT_ROOT_STYLE = {
  all: 'initial',
  // The two properties `all` leaves alone. A document is laid out left to
  // right in Word, so it is in the browser too, whatever the host's direction.
  direction: 'ltr',
  unicodeBidi: 'normal',
  display: 'block',
  visibility: 'inherit',
  pointerEvents: 'inherit',
  backgroundColor: '#ffffff',
} as const satisfies CSSProperties;

/**
 * The user agent defaults a host page's reset removes from the tags a
 * document may contain (Panda's preflight, a `*` rule), restored at zero
 * specificity. They are the defaults of a blank page, not a design: the PDF is
 * printed from a blank page, so this is what a preview has to match.
 *
 * Inherited properties that a reset sets on particular tags (`overflow-wrap`
 * on paragraphs, `text-wrap` on headings) are made to inherit again rather
 * than given a value, so a consumer that sets them on a container still
 * reaches the paragraphs inside it.
 *
 * The universal rule is spelled `:where(*)` so that it is a different
 * selector from the structural `*` rule when both are compiled into one
 * Panda `globalCss` object.
 */
const createNeutralElementStyleArray = (): CssRulesArray => [
  [':where(*)', { boxSizing: 'content-box', borderColor: 'currentColor' }],
  // The one tag the user agent gives a `border-box`.
  [':where(table)', { boxSizing: 'border-box' }],
  [
    ':where(p, h1, h2, h3, h4, h5, h6)',
    { overflowWrap: 'inherit', textWrapStyle: 'inherit' },
  ],
  [':where(ul, ol)', { marginBlock: '1em', paddingInlineStart: '40px' }],
  [':where(ul)', { listStyleType: 'disc' }],
  [':where(ol)', { listStyleType: 'decimal' }],
  [':where(ul, ol) :where(ul, ol)', { marginBlock: 0 }],
  [':where(ul, ol) :where(ul)', { listStyleType: 'circle' }],
  [':where(ul, ol) :where(ul, ol) :where(ul)', { listStyleType: 'square' }],
  [':where(sub, sup)', { position: 'static', top: 'auto', bottom: 'auto' }],
  [
    ':where(img, svg, video, canvas)',
    { display: 'inline', verticalAlign: 'baseline', maxWidth: 'none' },
  ],
];

const rootRules = (root: string, rules: CssRulesArray): CssRulesArray =>
  rules.map(([selector, style]) => [`:where(${root}) ${selector}`, style]);

/**
 * The rules that undo what a host page leaks into a document by accident,
 * rooted at `root`: the reset content root itself, and user agent defaults
 * below it. They do not depend on the document, and they come before a
 * consumer's `initialStyleSheets`, which may still reset content on purpose.
 *
 * `root` is `:scope` for the stylesheet the library installs itself, which is
 * adopted inside an `@scope` rule in each realm (so a consumer's scoped
 * stylesheets keep their order against it), and the content root class for
 * the Panda preset an application compiles into its own layers.
 */
export const createNeutralStyleArray = ({
  root,
}: {
  root: string;
}): CssRulesArray => [
  [`:where(${root})`, CONTENT_ROOT_STYLE],
  ...rootRules(root, createNeutralElementStyleArray()),
];

/**
 * Stands in for the CSS variable prefix in the stylesheet the library compiles
 * at build time. The prefix is runtime configuration (`prefixes` on
 * `DocumentProvider`), so the compiled sheet is a template that is
 * instantiated once per prefix a page renders with.
 */
export const CSS_VARIABLE_PREFIX_TOKEN = '__matti-docs-css-variable-prefix__';

/**
 * The structural rules of {@link createStructuralStyleArray}, rooted at `root`
 * (see {@link createNeutralStyleArray}) and read from the typography custom
 * properties under `prefixes.cssVariable`.
 */
export const createContentStyleArray = ({
  prefixes,
  root,
}: {
  prefixes: Pick<PrefixesConfig, 'cssVariable'>;
  root: string;
}): CssRulesArray => rootRules(root, createStructuralStyleArray({ prefixes }));

export const createVariantStyleString = (
  ...args: Parameters<typeof createVariantStyleArray>
) => cssRulesArrayToString(createVariantStyleArray(...args));
