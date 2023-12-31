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
        'src/reactToDocx.tsx',
        'src/reactToDom.tsx',
        'src/reactToPdf.tsx',
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
  },
});
