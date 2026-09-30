import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import tseslint from 'typescript-eslint';

import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importPlugin, { createNodeResolver } from 'eslint-plugin-import-x';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const EXTENSIONS_ALL = ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx'];

const GLOBS_ALL = EXTENSIONS_ALL.map((ext) => `src/**/*.${ext}`);

const DOTTED_EXTENSIONS_ALL = EXTENSIONS_ALL.map((ext) => `.${ext}`);

const TSCONFIG_PATH = path.join(ROOT_DIR, 'tsconfig.json');

/**
 * A specifier carrying a bundler query (`../dom?source`) is not the module it
 * looks like: `bundler/pluginSourceLoader.ts` replaces it with a module whose
 * default export is the bundled source text of `../dom`. Every resolver here
 * silently drops the query and hands back `../dom` itself, so `import-x/default`
 * and friends would judge the import against unrelated exports. Report those
 * specifiers as unresolvable instead; `import-x/no-unresolved` exempts them.
 */
const withoutLoaderQueries = (resolver) => ({
  interfaceVersion: 3,
  name: `${resolver.name}-without-loader-queries`,
  resolve: (modulePath, sourceFile) =>
    modulePath.includes('?')
      ? { found: false }
      : resolver.resolve(modulePath, sourceFile),
});

export default defineConfig([
  {
    files: GLOBS_ALL,
    plugins: {
      'import-x': importPlugin,
      '@typescript-eslint': tseslint.plugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: tseslint.parser,
      globals: {
        JSX: true,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { modules: true },
        projectService: true,
        tsconfigRootDir: ROOT_DIR,
      },
    },
    settings: {
      // `import-x/parsers` is deliberately absent: it names a module for
      // eslint-plugin-import-x to `require()` itself, and `@typescript-eslint/parser`
      // is no longer resolvable now that the unified `typescript-eslint` package
      // owns it. Under flat config the plugin falls back to
      // `languageOptions.parser`, which is that same parser.
      //
      // `import-x/extensions` therefore has to list the TypeScript extensions
      // explicitly. It is the set of files the plugin will follow and parse, so
      // without `.ts`/`.tsx` here `no-cycle`, `default` and `export` silently
      // analyse nothing in this project.
      'import-x/extensions': DOTTED_EXTENSIONS_ALL,
      'import-x/resolver-next': [
        withoutLoaderQueries(
          createTypeScriptImportResolver({ project: TSCONFIG_PATH }),
        ),
        withoutLoaderQueries(
          createNodeResolver({ extensions: DOTTED_EXTENSIONS_ALL }),
        ),
      ],
      'import-x/external-module-folders': [path.join(ROOT_DIR, 'node_modules')],
      react: {
        version: '18.2',
      },
    },
    rules: {
      ...tseslint.plugin.configs.recommended.rules,
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],

      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',

      // Listed explicitly rather than spread from
      // `reactHooksPlugin.configs.recommended.rules`: v7 folded the whole React
      // Compiler ruleset (`refs`, `globals`, `purity`, `set-state-in-effect`,
      // …) into `recommended`, which is a new set of rule decisions rather than
      // the two this project opted into.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      ...importPlugin.flatConfigs.recommended.rules,
      // Resolves every name a namespace import is used with. Off under
      // eslint-plugin-import because it did not understand flat config; import-x
      // does, so it is on.
      'import-x/namespace': 'error',
      // `../dom?source` is a Vite loader query, not a file on disk
      // (`src/types.d.ts` declares `*?source`), and `withoutLoaderQueries`
      // above deliberately refuses to resolve it. Exempt the query form rather
      // than switching the rule off.
      'import-x/no-unresolved': ['error', { ignore: ['\\?source$'] }],
      'import-x/first': 'error',
      'import-x/default': 'error',
      'import-x/named': 'off',
      'import-x/extensions': [
        'error',
        'ignorePackages',
        {
          // https://github.com/import-js/eslint-plugin-import/issues/1615
          js: 'never',
          mjs: 'never',
          cjs: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'import-x/order': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-relative-packages': 'error',
      'import-x/no-default-export': 'error',
      'import-x/no-cycle': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-absolute-path': 'error',
    },
  },
  {
    // Panda loads its config from the default export.
    files: ['**/panda.config.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
  {
    // Storybook's Component Story Format requires a default export.
    files: ['**/*.stories.tsx'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
]);
