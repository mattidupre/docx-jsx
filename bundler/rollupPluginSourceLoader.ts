import {
  rollup,
  type InputOptions,
  type OutputOptions,
  type NormalizedInputOptions,
  type Plugin,
  type InputPluginOption,
  type RollupCache,
  type RollupBuild,
} from 'rollup';

const PLUGIN_NAME = 'bundled-source-loader';

const LOADER_QUERY = '?source';

const META_KEY = `is-${PLUGIN_NAME}`;

const getInlineBase = (id: string) =>
  id.endsWith(LOADER_QUERY) ? id.replace(LOADER_QUERY, '') : undefined;

type PluginInstance = Plugin<any>;

type PluginOptions = InputOptions & { output?: OutputOptions };

/**
 * Load the fully-bundled source code for an IIFE module.
 * Looks for the ?code loader query.
 * @example const inlineCode = import('./foo?code'); eval(inlineCode);
 */
export default function pluginSourceLoader({
  plugins: pluginPluginsOption,
  ...rollupOptions
}: PluginOptions) {
  let plugins: InputPluginOption;
  let cache: undefined | RollupCache = undefined;
  let currentInputOptions: NormalizedInputOptions;

  const builds: Map<string, RollupBuild> = new Map();

  const instance = {} as PluginInstance;

  plugins = pluginPluginsOption ?? [instance];

  Object.assign<PluginInstance, PluginInstance>(instance, {
    name: PLUGIN_NAME,

    buildStart(options) {
      currentInputOptions = options;
    },

    async resolveId(source, importer) {
      const baseSource = getInlineBase(source);

      if (!baseSource) {
        return null;
      }

      const { id } = (await this.resolve(baseSource, importer)) ?? {
        id: undefined,
      };

      if (!id) {
        this.error(`${source} not found in filesystem.`);
      }

      return {
        meta: {
          [META_KEY]: true,
        },
        id: `${id}${LOADER_QUERY}`,
        moduleSideEffects: true,
      };
    },

    async load(id) {
      const baseId = getInlineBase(id);

      if (!baseId) {
        return null;
      }

      this.addWatchFile(baseId);

      const bundle = await rollup({
        ...rollupOptions,
        cache,
        input: baseId, // full path resolved in resolveId
        plugins,
      });

      if (currentInputOptions.cache !== false) {
        cache = bundle.cache;
      }

      builds.set(id, bundle);

      const result = await bundle.generate(rollupOptions?.output ?? {});

      if (result.output.length !== 1) {
        this.warn(`Invalid output for entry ${id}`);
        return 'export default undefined;';
      }

      const { code, moduleIds } = result.output[0];

      for (const moduleId of moduleIds) {
        if (this.getModuleInfo(moduleId)) {
          this.addWatchFile(moduleId);
        }
      }

      return `export default ${JSON.stringify(code)};`;
    },
  });

  return instance;
}
