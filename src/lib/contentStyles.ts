import type { PrefixesConfig } from '../entities';
import { CONTENT_STYLES_TEMPLATE } from '../generated/styles';
import {
  CSS_VARIABLE_PREFIX_TOKEN,
  createTrimFallbackStyleString,
} from './styles';

/**
 * The content stylesheet compiled from `panda.config.ts`, for a document's CSS
 * variable prefix, followed by the leading trim fallback (an `@supports` block,
 * which a Panda `globalCss` rule list cannot hold). Every rule in it is rooted
 * at `:scope`, so it is adopted inside `@scope` for the page root (or the
 * content root) it applies to, as `NEUTRAL_STYLES` is.
 */
export const instantiateContentStyles = ({
  prefixes,
}: {
  prefixes: Pick<PrefixesConfig, 'cssVariable'>;
}): string =>
  [
    CONTENT_STYLES_TEMPLATE.replaceAll(
      CSS_VARIABLE_PREFIX_TOKEN,
      prefixes.cssVariable,
    ),
    createTrimFallbackStyleString({ prefixes, root: ':scope' }),
  ].join('\n');
