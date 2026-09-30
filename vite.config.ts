/// <reference types="vitest/config" />

import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import { type PluginOption } from 'vite';
import pluginSourceLoader from './bundler/pluginSourceLoader.ts';
import { optimizeLodashImports as pluginLodash } from '@optimize-lodash/rollup-plugin';

type PackageManifest = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const manifest = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as PackageManifest;

/**
 * Everything the published package expects the consumer to provide: its
 * `dependencies` and `peerDependencies`, plus every Node builtin in both the
 * bare and the `node:`-prefixed spelling. `devDependencies` are absent on
 * purpose so build-time-only code keeps getting bundled.
 */
const EXTERNAL_MODULES = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

/** `lodash/merge.js` -> `lodash`, `@scope/name/sub` -> `@scope/name`. */
const toPackageName = (source: string) => {
  const segments = source.split('/');
  return source.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
};

/**
 * Lib-mode externals, replacing rollup-plugin-node-externals: its v9 needs Node
 * 24 and `RegExp.escape`, and this project's floor is Node 22.
 */
const isExternalModule = (source: string) =>
  EXTERNAL_MODULES.has(source) || EXTERNAL_MODULES.has(toPackageName(source));

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: [
        'src/panda-preset.ts',
        'src/previewElement.ts',
        'src/reactComponents.ts',
        'src/reactToDocx.ts',
        'src/reactToDom.ts',
        'src/reactToHtmlDocument.ts',
        'src/reactToPdf.ts',
        'src/reactToScript.ts',
        'src/utils.ts',
      ],
    },
    rolldownOptions: {
      external: isExternalModule,
    },
  },
  plugins: [pluginSourceLoader() as PluginOption, pluginLodash()],
  test: {
    include: ['./src/**/*.test.{js,jsx,ts,tsx}'],
    globalSetup: ['./scripts/vitestGlobalSetup.ts'],
    // includeSource: ['./src/**/*.{js,jsx,ts,tsx}'],
    // Launching Chrome and paginating the mock document is slow.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      // Report on every source file, not only the ones a test happened to load.
      // Vitest 4 removed `coverage.all`; an explicit `include` now does that job.
      include: ['src/**'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/demo/**',
        'src/fixtures/**',
        // Test harness, not library code.
        'src/visual/**',
        'src/generated/**',
      ],
      reporter: ['text', 'json-summary'],
      // Coverage of a partially failing run is still worth reading.
      reportOnFailure: true,
    },
  },
});
