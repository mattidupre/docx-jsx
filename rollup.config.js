// @ts-check

import { defineConfig } from 'rollup';
import pluginTypeScript from '@rollup/plugin-typescript';
import pluginEsBuild from 'rollup-plugin-esbuild';
import pluginCommonJs from '@rollup/plugin-commonjs';
import { nodeResolve as pluginNodeResolve } from '@rollup/plugin-node-resolve';
import jsonPlugin from '@rollup/plugin-json';
import nodeExternalsPlugin from 'rollup-plugin-node-externals';

export default defineConfig([
  // { input: 'src/index.ts', output: { file: 'dist/index.js', sourcemap: true,
  //   format: 'esm', }, plugins: [ nodeExternalsPlugin({}), pluginCommonJs(),
  //   pluginNodeResolve(), jsonPlugin(), pluginEsBuild({ target: 'esnext', }),
  //     ], },

  {
    input: 'src/headless.ts',
    output: {
      file: 'dist/headless.cjs',
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

  // { input: 'src/react.ts', output: { sourcemap: true, dir: 'dist', format:
  //   'esm', }, plugins: [ nodeExternalsPlugin({ builtins: false, }),
  //   jsonPlugin(), pluginEsBuild({ target: 'esnext', }), ], }, { input:
  // ['src/reactToDocx.tsx', 'src/reactToDom.tsx', 'src/reactToPdf.tsx'],
  // output: { sourcemap: true, dir: 'dist', format: 'esm', }, plugins: [
  //   nodeExternalsPlugin({}), jsonPlugin(), pluginEsBuild({ target: 'esnext',
  //   }), ], },
]);
