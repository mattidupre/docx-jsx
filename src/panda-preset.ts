import type { Preset } from '@pandacss/dev';
import {
  PAGE_CLASS_NAMES,
  assignPrefixesOptions,
  type PrefixesOptions,
} from './entities';
import { cssRulesToGlobalCss } from './lib/pandaGlobalCss';
import { createContentStyleArray, createNeutralStyleArray } from './lib/styles';

/**
 * The library's content rules as a Panda preset, for an application that
 * would rather compile them into its own cascade layers (`base`) than rely on
 * the copy the library installs itself; the library works without it.
 *
 * The neutral rules (which undo a host page's reset inside a page) come
 * first, then the structural ones. Every rule is rooted at the
 * `matti-docs-content-root` class, which each rendered page carries, at zero
 * specificity. `prefixes` has to match the one
 * the documents are rendered with, because the rules read the typography
 * custom properties under that prefix.
 *
 * @example
 * // panda.config.ts
 * import { createMattiDocsPreset } from 'matti-docs/panda-preset';
 * export default defineConfig({ presets: [createMattiDocsPreset()] });
 */
export const createMattiDocsPreset = (prefixes?: PrefixesOptions): Preset => ({
  name: 'matti-docs',
  globalCss: cssRulesToGlobalCss([
    ...createNeutralStyleArray({
      root: PAGE_CLASS_NAMES.selector('contentRoot'),
    }),
    ...createContentStyleArray({
      prefixes: assignPrefixesOptions(prefixes),
      root: PAGE_CLASS_NAMES.selector('contentRoot'),
    }),
  ]),
});
