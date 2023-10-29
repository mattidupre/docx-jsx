import * as esbuild from 'esbuild';

const SHARED_OPTIONS = {
  logLevel: 'info',
  outdir: './dist',
};

const OPTIONS = [
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
    // splitting: true,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    external: ['react'],
  },
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/server'],
    bundle: false,
    treeShaking: true,
    format: 'esm',
    platform: 'node',
  },
];

try {
  if (process.argv.includes('--watch')) {
    const contexts = await Promise.all(
      OPTIONS.map(async (options) => {
        const context = await esbuild.context(options);
        context.watch();
        return context;
      }),
    );
  } else {
    await Promise.all(OPTIONS.map((options) => esbuild.build(options)));
  }
} catch (err) {
  console.error(err);
  process.exit();
}
