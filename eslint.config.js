// @ts-check

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineFlatConfig } from 'eslint-define-config';
import globals from 'globals';

// @ts-expect-error
import typescriptParser from '@typescript-eslint/parser';

import typescriptPlugin from '@typescript-eslint/eslint-plugin';
// @ts-expect-error
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const EXTENSIONS_ALL = ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx'];

const GLOBS_ALL = EXTENSIONS_ALL.map((ext) => `src/**/*.${ext}`);

const TSCONFIG_PATH = path.join(ROOT_DIR, 'tsconfig.json');

export default defineFlatConfig([
  {
    files: GLOBS_ALL,
    plugins: {
      import: importPlugin,
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: typescriptParser,
      parserOptions: {
        parserOptions: {
          ecmaFeatures: { modules: true },
          project: TSCONFIG_PATH,
        },
        globals: {
          JSX: true,
          ...globals.node,
        },
      },
    },
    settings: {
      'import/parsers': { ['@typescript-eslint/parser']: EXTENSIONS_ALL },
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
      ...typescriptPlugin.configs.recommended.rules,
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

      ...reactHooksPlugin.configs.recommended.rules,
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
]);
