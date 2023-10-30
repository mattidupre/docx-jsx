import fs from 'node:fs/promises';
import * as esbuild from 'esbuild';

const BUILD_OPTIONS = {
  color: true,
  logLimit: 0,
};

const SHARED_OPTIONS = {
  logLevel: 'info',
  outdir: './dist',
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
    external: ['react'],
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
    const contexts = await Promise.all(
      SRC_OPTIONS.map(async (options) => {
        const context = await esbuild.context(options);
        context.watch({
          ...BUILD_OPTIONS,
        });
        return context;
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
