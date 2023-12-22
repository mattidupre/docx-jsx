import * as esbuild from 'esbuild';

try {
  await esbuild.build({
    logLevel: 'info',
    outdir: './dist',
    entryPoints: ['./src/headless.ts'],
    sourcemap: true,
    treeShaking: true,
    bundle: true,
    splitting: false,
    platform: 'browser',
    format: 'iife',
    outExtension: { '.js': '.cjs' },
  });
} catch (err) {
  console.error(err);
  process.exit();
}
