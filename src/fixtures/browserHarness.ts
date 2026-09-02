import { build } from 'esbuild';
import type { JsonValue } from 'type-fest';
import type { Browser } from 'puppeteer-core';

/**
 * The global the bundled module exports are assigned to inside the page.
 */
const GLOBAL_NAME = 'mattiDocsHarness';

const BLANK_PAGE_HTML =
  '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

export type BrowserHarnessOptions = {
  /**
   * Module specifiers whose exports become the page API, resolved relative to
   * {@link BrowserHarnessOptions.resolveDir}.
   */
  modules: ReadonlyArray<string>;
  /**
   * Directory the module specifiers resolve from, usually the directory of the
   * test file (`path.dirname(fileURLToPath(import.meta.url))`).
   */
  resolveDir: string;
  /**
   * Forces every `attachShadow` call in the page to `mode: 'open'` so that a
   * test can read inside roots the library deliberately closes.
   */
  openShadowRoots?: boolean;
};

export type BrowserHarness<TApi> = {
  /**
   * Runs `callback` inside the page with the bundled exports as its first
   * argument. The callback is serialized, so it may only use `api`, its own
   * arguments and browser globals — never a binding from the test module.
   * Arguments and the result cross the boundary as JSON.
   */
  evaluate: <TResult, TArgs extends ReadonlyArray<JsonValue>>(
    callback: (api: TApi, ...args: TArgs) => TResult | Promise<TResult>,
    ...args: TArgs
  ) => Promise<TResult>;
  close: () => Promise<void>;
};

/**
 * Bundles the modules into a single IIFE that assigns their exports to
 * {@link GLOBAL_NAME}. TypeScript and TSX are compiled, so library modules can
 * be tested in a real browser without a build step.
 */
const bundleModules = async ({
  modules,
  resolveDir,
}: Pick<BrowserHarnessOptions, 'modules' | 'resolveDir'>): Promise<string> => {
  const { outputFiles } = await build({
    stdin: {
      contents: modules
        .map((module) => `export * from ${JSON.stringify(module)};`)
        .join('\n'),
      resolveDir,
      sourcefile: 'browserHarness.tsx',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: GLOBAL_NAME,
    platform: 'browser',
    target: 'esnext',
    jsx: 'automatic',
    // React and its dependencies branch on this at module scope.
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  });
  const [outputFile] = outputFiles;
  if (!outputFile) {
    throw new Error('esbuild produced no output for the browser harness.');
  }
  return outputFile.text;
};

/**
 * Bundles `modules`, injects them into a blank page of `browser` and returns a
 * handle for running typed callbacks against them. The caller owns the browser
 * (see `launchTestBrowser`) and must {@link BrowserHarness.close} the harness.
 */
export const createBrowserHarness = async <TApi>(
  browser: Browser,
  { modules, resolveDir, openShadowRoots }: BrowserHarnessOptions,
): Promise<BrowserHarness<TApi>> => {
  const scriptContent = await bundleModules({ modules, resolveDir });

  const page = await browser.newPage();

  page.on('console', (message) => {
    console.info(`Browser harness: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    console.error(`Browser harness: ${error.message}`);
  });

  await page.setContent(BLANK_PAGE_HTML);

  if (openShadowRoots) {
    await page.evaluate(() => {
      const { attachShadow } = Element.prototype;
      Element.prototype.attachShadow = function attachOpenShadow(
        init: ShadowRootInit,
      ) {
        return attachShadow.call(this, { ...init, mode: 'open' });
      };
    });
  }

  await page.addScriptTag({ content: scriptContent });

  const evaluate = async <TResult, TArgs extends ReadonlyArray<JsonValue>>(
    callback: (api: TApi, ...args: TArgs) => TResult | Promise<TResult>,
    ...args: TArgs
  ): Promise<TResult> => {
    const result = await page.evaluate(
      async (globalName, source, callbackArgs) => {
        const api = (globalThis as Record<string, unknown>)[globalName];
        const run = new Function(`return (${source});`)() as (
          ...runArgs: ReadonlyArray<unknown>
        ) => unknown;
        return await run(api, ...callbackArgs);
      },
      GLOBAL_NAME,
      callback.toString(),
      args as ReadonlyArray<JsonValue>,
    );
    return result as TResult;
  };

  return { evaluate, close: () => page.close() };
};
