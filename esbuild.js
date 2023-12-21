import * as esbuild from 'esbuild';

const pluginMarkExternal = {
  name: 'mark-external',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      console.log(args.path);
      // if (!/^(#|\/|\.\/|\.\.\/)/.test(args.path)) {
      //   reportPackagePath(args.path); return { external: true }; }
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
  treeShaking: true,
  plugins: [pluginMarkExternal],
};

const SRC_OPTIONS = [
  // Fully bundled single-file exports.
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/headless.ts'],
    bundle: true,
    splitting: false,
    format: 'iife',
    outExtension: { '.js': '.cjs' },
    platform: 'browser',
  },
  // Exports targeting the browser.
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/index.ts', './src/react.ts', './src/reactToDom.tsx'],
    platform: 'browser',
    format: 'esm',
    // outExtension: { '.js': '.mjs' },
  },
  // Exports targeting the server.
  {
    ...SHARED_OPTIONS,
    entryPoints: ['./src/reactToDocx.tsx', './src/reactToPdf.tsx'],
    platform: 'node',
    format: 'esm',
    // outExtension: { '.js': '.mjs' },
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
