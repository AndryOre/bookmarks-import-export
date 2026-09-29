import { plugin as shadcn } from '@shadcn/lint'
import prettierConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

import wxtAutoImports from './.wxt/eslint-auto-imports.mjs'

const eslintConfig = defineConfig([
  wxtAutoImports,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-deprecated': 'warn',
    },
  },
  react.configs.flat.recommended,
  {
    // Explicit plugin registration + rules extraction instead of spreading
    // `reactHooks.configs['recommended-latest']` directly: combining that
    // object as-is with a typescript-eslint `extends` block elsewhere in
    // this same config array corrupts its `plugins` field down to the
    // legacy eslintrc array shape (`['react-hooks']`) by the time ESLint
    // validates the full config, which then throws "plugins key defined as
    // an array of strings". Unclear which package's flat-config resolution
    // causes it; this sidesteps it entirely.
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules,
  },
  jsxA11y.flatConfigs.recommended,
  unicorn.configs.recommended,
  {
    rules: {
      'unicorn/no-null': 'off',
      'unicorn/no-array-reduce': ['error', { allowSimpleOperations: false }],
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true, pascalCase: true },
          ignore: [/^\[.+\]/, /^\(.+\)/],
        },
      ],
      // `lib/utils.ts` is shadcn/ui's own generated convention
      // (components.json `aliases.utils` -> `@/lib/utils`) — renaming it
      // would fight every future `shadcn add`.
      'unicorn/name-replacements': ['error', { allowList: { utils: true } }],
    },
  },
  {
    settings: {
      react: {
        version: '19',
      },
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { shadcn },
    rules: {
      'shadcn/no-restyle': 'error',
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/no-inline-styles': 'error',
      'shadcn/no-unknown-classes': 'error',
      'shadcn/require-static-classes': 'error',
    },
  },
  {
    /**
     * `components/ui/**` is the shadcn/ui registry code itself — generated
     * layer, exempt from these three rules for the same reasons as
     * andryore-dev's eslint.config.mjs.
     */
    files: ['components/ui/**'],
    rules: {
      'shadcn/no-restyle': 'off',
      'shadcn/no-arbitrary-values': 'off',
      'shadcn/require-static-classes': 'off',
    },
  },
  {
    files: ['**/*.tsx'],
    ignores: ['components/ui/**'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: [],
        },
      ],
    },
  },
  prettierConfig,
  globalIgnores(['.output/**', '.wxt/**']),
  { ignores: ['components/**'] }, // removed by AO-804
  { ignores: ['entrypoints/**/*.tsx'] }, // removed by AO-805
])

export default eslintConfig
