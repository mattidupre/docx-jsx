import { defineConfig } from '@pandacss/dev';
import { createMattiDocsPreset } from '../../panda-preset';

/**
 * An application config that compiles the library's content rules into its
 * own layers, as a matti-kit app would.
 */
export default defineConfig({
  presets: [createMattiDocsPreset({ cssVariable: 'resume' })],
  preflight: false,
  include: [],
  outdir: '../../../node_modules/.cache/matti-docs-preset-consumer',
});
