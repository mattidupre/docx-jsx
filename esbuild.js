import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';

const omToCssPlugin = {
  name: 'omToCss',
  setup(build) {
    build.onEnd(async () => {
      const { documentStyleCss } = await import('./dist/style.mjs');
      await fs.writeFile('./dist/style.css', documentStyleCss);
    });
  },
};

const BUILD_OPTIONS = {
  // color: true,
  logLimit: 0,
};

const SHARED_OPTIONS = {
  logLevel: 'info',
  outdir: './dist',
  sourcemap: true,
  plugins: [omToCssPlugin],
};

const SRC_OPTIONS = [
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/headless.ts'],
    bundle: true,
    splitting: false,
    treeShaking: true,
    format: 'iife',
    platform: 'browser',
  },
  {
    ...SHARED_OPTIONS,
    entryPoints: [
      './src/components.ts',
      './src/reactToDom.ts',
      './src/style.ts',
    ],
    bundle: true,
    treeShaking: true,
    platform: 'browser',
    // external: ['react', 'react-dom'],
    packages: 'external',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
  },
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/reactToDocx.ts', './src/reactToPdf.ts'],
    bundle: true,
    packages: 'external',
    treeShaking: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
  },
];

try {
  if (process.argv.includes('--watch')) {
    await Promise.all(
      SRC_OPTIONS.map(async (options) => {
        const context = await esbuild.context({
          ...BUILD_OPTIONS,
          ...options,
        });
        context.watch();
      }),
    );
  } else {
    await Promise.all(
      SRC_OPTIONS.map((options) =>
        esbuild.build({ ...BUILD_OPTIONS, ...options }),
      ),
    );
  }
} catch (err) {
  console.error(err);
  process.exit();
}
