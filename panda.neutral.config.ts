import { defineConfig } from '@pandacss/dev';
import { createPageSplitStyleArray } from './src/lib/pageStyles';
import { cssRulesToGlobalCss } from './src/lib/pandaGlobalCss';
import { createNeutralStyleArray } from './src/lib/styles';

/**
 * The rules the library installs ahead of a consumer's `initialStyleSheets`:
 * the neutral half of `createMattiDocsPreset`, which undoes what a host page
 * leaks into a document, and pagedjs's rules for split elements. Neither
 * depends on the document.
 */
export default defineConfig({
  preflight: false,
  include: [],
  outdir: 'node_modules/.cache/matti-docs-styled-system',
  globalCss: cssRulesToGlobalCss([
    ...createNeutralStyleArray({ root: ':scope' }),
    ...createPageSplitStyleArray({ root: ':scope' }),
  ]),
});
