// @ts-check

import { defineConfig } from 'rollup';
import pluginEsBuild from 'rollup-plugin-esbuild';
import pluginCommonJs from '@rollup/plugin-commonjs';
import { nodeResolve as pluginNodeResolve } from '@rollup/plugin-node-resolve';
import jsonPlugin from '@rollup/plugin-json';
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin';
import pluginSourceLoader from './bundler/pluginSourceLoader.js';

// https://rollupjs.org/tutorial/#code-splitting

export default defineConfig([
  {
    input: [
      'src/reactComponents.ts',
      'src/reactToDocx.tsx',
      'src/reactToDom.tsx',
      'src/reactToPdf.tsx',
    ],
    plugins: [
      pluginCommonJs(),
      pluginNodeResolve(),
      jsonPlugin(),
      pluginEsBuild({
        target: 'esnext',
      }),
      optimizeLodashImports(),
      pluginSourceLoader(),
    ],
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        chunkFileNames: 'chunks/[name].cjs',
        entryFileNames: '[name].cjs',
        sourcemap: true,
      },
      {
        dir: 'dist',
        format: 'esm',
        chunkFileNames: 'chunks/[name].mjs',
        entryFileNames: '[name].mjs',
        sourcemap: true,
      },
    ],
    external: [/node_modules/],
    onwarn: (message) => {
      if (message.code === 'EVAL') {
        return;
      }
      console.warn(message);
    },
  },
]);
