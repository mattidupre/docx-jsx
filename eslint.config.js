import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

import tseslint from 'typescript-eslint';

// @ts-expect-error
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const EXTENSIONS_ALL = ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx'];

const GLOBS_ALL = EXTENSIONS_ALL.map((ext) => `src/**/*.${ext}`);

const TSCONFIG_PATH = path.join(ROOT_DIR, 'tsconfig.json');

export default defineConfig([
  {
    files: GLOBS_ALL,
    plugins: {
      import: importPlugin,
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
      // `import/parsers` is deliberately absent: it names a module for
      // eslint-plugin-import to `require()` itself, and `@typescript-eslint/parser`
      // is no longer resolvable now that the unified `typescript-eslint` package
      // owns it. Under flat config the plugin falls back to
      // `languageOptions.parser`, which is that same parser.
      'import/resolver': {
        typescript: { project: TSCONFIG_PATH },
        node: {
          extensions: EXTENSIONS_ALL,
        },
      },
      'import/external-module-folders': [path.join(ROOT_DIR, 'node_modules')],
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

      ...importPlugin.configs.recommended.rules,
      // Doesn't work with flat configs.
      'import/namespace': 'off',
      'import/first': 'error',
      'import/default': 'error',
      'import/named': 'off',
      'import/extensions': [
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
      'import/order': 'error',
      'import/no-self-import': 'error',
      'import/no-relative-packages': 'error',
      'import/no-default-export': 'error',
      'import/no-cycle': 'error',
      'import/newline-after-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-absolute-path': 'error',
    },
  },
  {
    // Storybook's Component Story Format requires a default export.
    files: ['**/*.stories.tsx'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
]);
