import { defineConfig } from '@pandacss/dev';
import { cssRulesToGlobalCss } from './src/lib/pandaGlobalCss';
import {
  CSS_VARIABLE_PREFIX_TOKEN,
  createContentStyleArray,
} from './src/lib/styles';

/**
 * The document's content rules as the library installs them itself
 * (`scripts/buildStyles.ts`): the structural half of what
 * `createMattiDocsPreset` gives an application, rooted at `:scope` because the
 * library adopts them inside `@scope`, with the CSS variable prefix left as a
 * token to instantiate per document.
 *
 * `preflight` is off: resetting is the host application's business, and
 * `panda.neutral.config.ts` exists to undo exactly that reset inside a page.
 */
export default defineConfig({
  preflight: false,
  include: [],
  outdir: 'node_modules/.cache/matti-docs-styled-system',
  globalCss: cssRulesToGlobalCss(
    createContentStyleArray({
      prefixes: { cssVariable: CSS_VARIABLE_PREFIX_TOKEN },
      root: ':scope',
    }),
  ),
});
