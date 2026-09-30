import { defineAttributes, defineClassNames } from './attributeHandles';
import type { ElementType } from './elements';
import { DEFAULT_PREFIX, type PrefixesConfig } from './options';
import type { TypographyCssKey, VariantName } from './typography';

/**
 * Every name the library generates -- the element data attributes, the element
 * and variant classes, the typography custom properties, the page classes and
 * the page geometry variables -- is declared here, once. The runtime writers
 * and the stylesheet builders both read them from these handles, so the names
 * one writes and the other selects cannot drift apart.
 */

/**
 * The four attributes the DOCX mapper reads its meaning from. Their prefix is
 * the constant {@link DEFAULT_PREFIX} rather than the user's `PrefixesConfig`:
 * the document element itself carries the prefixes, so its attributes have to
 * be decodable before any user configuration is known. The payloads are
 * encoded above this layer (`elements.ts`).
 */
export const ELEMENT_DATA_ATTRIBUTES = defineAttributes(DEFAULT_PREFIX, {
  elementType: { attributeTypes: ['data-attribute'] },
  elementOptions: { attributeTypes: ['data-attribute'] },
  contentOptions: { attributeTypes: ['data-attribute'] },
  variant: { attributeTypes: ['data-attribute'] },
});

const CSS_VAR = { attributeTypes: ['css-var'] } as const;

/**
 * One custom property per typography option the browser reads. Declared in
 * the order of `TYPOGRAPHY_CSS_KEYS`, which is the order they are written in.
 */
const TYPOGRAPHY_VARS_SCHEMA = {
  breakInside: CSS_VAR,
  breakAfter: CSS_VAR,
  textAlign: CSS_VAR,
  lineHeight: CSS_VAR,
  fontWeight: CSS_VAR,
  fontStyle: CSS_VAR,
  fontSize: CSS_VAR,
  fontFamily: CSS_VAR,
  color: CSS_VAR,
  textTransform: CSS_VAR,
  textDecoration: CSS_VAR,
  textIndent: CSS_VAR,
  marginTop: CSS_VAR,
  marginRight: CSS_VAR,
  marginBottom: CSS_VAR,
  paddingBottom: CSS_VAR,
  borderBottomWidth: CSS_VAR,
  borderBottomColor: CSS_VAR,
  marginLeft: CSS_VAR,
  whiteSpace: CSS_VAR,
} as const satisfies Record<TypographyCssKey, typeof CSS_VAR>;

/**
 * The typography custom properties under a document's CSS variable prefix,
 * e.g. `--matti-docs-font-size`.
 */
export const createTypographyVars = ({
  prefixes,
}: {
  prefixes: Pick<PrefixesConfig, 'cssVariable'>;
}) => defineAttributes(prefixes.cssVariable, TYPOGRAPHY_VARS_SCHEMA);

/**
 * The custom properties of a paragraph's text box, which the paragraph rule
 * reads: `textBox` is the `text-box` a trimmed paragraph declares, and the
 * `trim` ones carry capsize's pseudo-element trim for browsers without
 * `text-box` (`trim` is the pseudo-elements' `content`, set only on trimmed
 * paragraphs).
 */
const LINE_BOX_VARS_SCHEMA = {
  textBox: CSS_VAR,
  trim: CSS_VAR,
  trimCapHeight: CSS_VAR,
  trimBaseline: CSS_VAR,
} as const;

/**
 * The line box custom properties under a document's CSS variable prefix,
 * e.g. `--matti-docs-text-box`.
 */
export const createLineBoxVars = ({
  prefixes,
}: {
  prefixes: Pick<PrefixesConfig, 'cssVariable'>;
}) => defineAttributes(prefixes.cssVariable, LINE_BOX_VARS_SCHEMA);

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
) => defineClassNames<ElementType>(prefixes.elementClassName).name(elementType);

/**
 * The class a variant's custom properties are assigned to, e.g.
 * `matti-docs-variant-heading-1`.
 */
export const variantNameToClassName = (
  { prefixes }: { prefixes: Pick<PrefixesConfig, 'variantClassName'> },
  variantName: VariantName,
) => defineClassNames<VariantName>(prefixes.variantClassName).name(variantName);

/**
 * The classes of the page chrome. The `matti-docs` prefix is deliberate rather
 * than derived from `prefixes`: the page stylesheet is shared by every
 * document on the page, so its selectors have to be the same for all of them.
 *
 * `contentRoot` marks the element document content is laid out under, in
 * every realm: the page root on screen and the root the Fragmenter measures
 * content under. The library's content rules are rooted at it.
 */
export const PAGE_CLASS_NAMES = defineClassNames<
  'pageRoot' | 'page' | 'contentRoot'
>(DEFAULT_PREFIX);

/** The page geometry a page element is laid out from, e.g. `--page-width`. */
export const PAGE_VARS = defineAttributes('page', {
  width: CSS_VAR,
  height: CSS_VAR,
  marginHeader: CSS_VAR,
  marginTop: CSS_VAR,
  marginRight: CSS_VAR,
  marginBottom: CSS_VAR,
  marginFooter: CSS_VAR,
  marginLeft: CSS_VAR,
});

/**
 * Marks a page root with the stylesheets it was rendered with (a hash of their
 * text). A render's stylesheets are scoped to its own pages, so previews with
 * different prefixes, variants or consumer stylesheets can share a page
 * without their rules reaching each other's content.
 */
export const PAGE_DATA_ATTRIBUTES = defineAttributes(DEFAULT_PREFIX, {
  documentStyles: { attributeTypes: ['data-attribute'] },
});
