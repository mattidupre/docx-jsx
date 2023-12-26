/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { type PluginOption } from 'vite';
import pluginSourceLoader from './bundler/pluginSourceLoader';
import pluginNodeExternals from 'rollup-plugin-node-externals';

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
  ],
  test: {
    include: ['./src/**.test.{ts,tsx}'],
    setupFiles: ['./testSetup.js'],
  },
});
