// @ts-check

import { defineConfig } from 'rollup';
import pluginEsBuild from 'rollup-plugin-esbuild';
import pluginCommonJs from '@rollup/plugin-commonjs';
import { nodeResolve as pluginNodeResolve } from '@rollup/plugin-node-resolve';
import jsonPlugin from '@rollup/plugin-json';
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin';

// https://rollupjs.org/tutorial/#code-splitting

const ENTRIES = [
  'src/reactComponents.ts',
  'src/reactToDocx.tsx',
  'src/reactToDom.tsx',
  'src/reactToPdf.tsx',
];

const PLUGINS = [
  pluginCommonJs(),
  pluginNodeResolve({ browser: true }),
  jsonPlugin(),
  pluginEsBuild({
    target: 'esnext',
  }),
  optimizeLodashImports(),
];

export default defineConfig([
  {
    input: ENTRIES,
    output: {
      dir: 'dist-cjs',
      format: 'cjs',
      sourcemap: true,
    },
    external: [/node_modules/],
    plugins: PLUGINS,
  },
  {
    input: ENTRIES,
    output: {
      dir: 'dist-esm',
      format: 'esm',
      sourcemap: true,
    },
    external: [/node_modules/],
    plugins: PLUGINS,
  },
  {
    input: 'src/headless.ts',
    output: {
      dir: 'dist-cjs',
      sourcemap: true,
      format: 'iife',
    },
    plugins: [
      pluginCommonJs(),
      pluginNodeResolve({ browser: true }),
      jsonPlugin(),
      pluginEsBuild({
        target: 'esnext',
      }),
    ],
  },
]);
