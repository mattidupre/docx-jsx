import fs from 'node:fs/promises';
import * as esbuild from 'esbuild';

const BUILD_OPTIONS = {
  // color: true,
  logLimit: 0,
};

const SHARED_OPTIONS = {
  logLevel: 'info',
  outdir: './dist',
  sourcemap: true,
};

const SRC_OPTIONS = [
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/headless'],
    bundle: true,
    splitting: false,
    treeShaking: true,
    format: 'iife',
    platform: 'browser',
  },
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/components', './src/frontend'],
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
    entryPoints: ['./src/server'],
    bundle: true,
    packages: 'external',
    treeShaking: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
  },
];

try {
  await fs.rm(SHARED_OPTIONS.outdir, { recursive: true, force: true });

  if (process.argv.includes('--watch')) {
    await Promise.all(
      SRC_OPTIONS.map(async (options) => {
        const context = await esbuild.context({ ...BUILD_OPTIONS, ...options });
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
