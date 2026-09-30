import { defineConfig } from '@pandacss/dev';
import { createPageShadowStyleArray } from './src/lib/pageStyles';
import { cssRulesToGlobalCss } from './src/lib/pandaGlobalCss';

/**
 * The stylesheet of a page element's shadow root, configured as matti-kit's
 * `panda.shadow.config.ts` is so that its build can later be replaced by
 * kit's `build-shadow-stylesheet`: preflight on (with its `html, :host` rule
 * stripped by the build), and no `dark`/`light` conditions, which could not
 * see the page's theme from inside a shadow root.
 */
export default defineConfig({
  preflight: true,
  include: [],
  outdir: 'node_modules/.cache/matti-docs-shadow-styled-system',
  globalCss: cssRulesToGlobalCss(createPageShadowStyleArray()),
  plugins: [
    {
      name: 'shadow-root-theme-conditions',
      hooks: {
        'config:resolved': ({ config }) => {
          delete config.conditions?.dark;
          delete config.conditions?.light;
        },
      },
    },
  ],
});
