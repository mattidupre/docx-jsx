import pluginEsBuild from 'rollup-plugin-esbuild';
import pluginCommonJs from '@rollup/plugin-commonjs';
import { nodeResolve as pluginNodeResolve } from '@rollup/plugin-node-resolve';
import jsonPlugin from '@rollup/plugin-json';
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin';
import pluginTerser from '@rollup/plugin-terser';
import pluginCleanup from 'rollup-plugin-cleanup';
import pluginSourceLoader from './rollupPluginSourceLoader';

export default () =>
  pluginSourceLoader({
    plugins: [
      pluginCommonJs(),
      pluginNodeResolve({ browser: true }),
      jsonPlugin(),
      pluginEsBuild({
        target: 'esnext',
      }),
      optimizeLodashImports(),
      pluginTerser(),
      pluginCleanup({ sourcemap: false }),
    ],
    output: {
      format: 'cjs',
    },
  });
