/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { type PluginOption } from 'vite';
import pluginSourceLoader from './bundler/pluginSourceLoader';
import pluginNodeExternals from 'rollup-plugin-node-externals';
import { optimizeLodashImports as pluginLodash } from '@optimize-lodash/rollup-plugin';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: [
        'src/reactComponents.ts',
        'src/reactToDocx.ts',
        'src/reactToDom.ts',
        'src/reactToHtmlDocument.ts',
        'src/reactToPdf.ts',
        'src/reactToScript.ts',
        'src/utils.ts',
      ],
    },
  },
  plugins: [
    { ...pluginNodeExternals(), enforce: 'pre' } as PluginOption,
    pluginSourceLoader() as PluginOption,
    pluginLodash(),
  ],
  test: {
    include: ['./src/**/*.test.{js,jsx,ts,tsx}'],
    // includeSource: ['./src/**/*.{js,jsx,ts,tsx}'],
    setupFiles: ['./testSetup.js'],
    // Launching Chrome and paginating the mock document is slow.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      // Report on every source file, not only the ones a test happened to load.
      all: true,
      include: ['src/**'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/demo/**',
        'src/fixtures/**',
        // Test harness, not library code.
        'src/visual/**',
      ],
      reporter: ['text', 'json-summary'],
      // Coverage of a partially failing run is still worth reading.
      reportOnFailure: true,
    },
  },
});
