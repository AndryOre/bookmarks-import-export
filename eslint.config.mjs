import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'
import { plugin as shadcn } from '@shadcn/lint'
import vitest from '@vitest/eslint-plugin'
import prettierConfig from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

import wxtAutoImports from './.wxt/eslint-auto-imports.mjs'
import localPlugin from './eslint-rules/index.mjs'

/**
 * Punctuation/symbol-only JSX text that `react/jsx-no-literals` would
 * otherwise flag as copy — none of these carry translatable meaning.
 */
const JSX_NO_LITERALS_ALLOWED_STRINGS = [
  '/',
  /**
   * The exported HTML file's fixed extension — a technical suffix, not
   * translatable copy.
   */
  '.html',
  '—',
]

/**
 * Per-component exceptions to `shadcn/no-restyle`, each encoding one real,
 * bounded design decision rather than disabling the rule outright.
 *
 * - `Input`: the popup/dialog UI has no responsive breakpoints, so every
 *   `Input` locks in the `md:` text-sm size instead of also carrying the
 *   mobile-only text-base. A few inputs also overlay a leading icon and
 *   need matching start padding to keep typed text clear of it.
 * - `Label`: the time-picker's Hours/Minutes/Period captions intentionally
 *   use a smaller, muted treatment instead of Label's default typography —
 *   there is no dedicated caption variant for this yet.
 * - `CardTitle`/`CardDescription`: the settings and auto-export pages render a
 *   deliberately compact title/description scale (bolder + smaller than
 *   Card's own defaults).
 */
const shadcnNoRestyleContracts = [
  {
    pattern: '^Input$',
    allow: ['layout', 'text-sm', 'pl-8'],
  },
  {
    pattern: '^Label$',
    allow: ['layout', 'text-xs', 'text-muted-foreground'],
  },
  {
    pattern: '^CardTitle$',
    allow: ['layout', 'text-sm', 'font-semibold'],
  },
  {
    pattern: '^CardDescription$',
    allow: ['layout', 'text-xs'],
  },
]

/**
 * `eslint-plugin-jsdoc`'s TypeScript-flavored recommended rules, with
 * `require-jsdoc` turned off (this repo documents only non-obvious
 * exports, not everything — see later wave-2/wave-3 tickets) and
 * `informative-docs` turned on (rejects JSDoc that just restates the
 * declaration's name).
 */
const jsdocRules = {
  ...jsdoc.configs['flat/recommended-typescript-error'].rules,
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/informative-docs': 'error',
}

/**
 * `@eslint-community/eslint-plugin-eslint-comments`'s recommended rules,
 * with `require-description` turned on so every `eslint-disable*` comment
 * must say why.
 */
const eslintCommentsRules = {
  ...eslintComments.configs.recommended.rules,
  '@eslint-community/eslint-comments/require-description': 'error',
}

/**
 * This repo's local `no-non-doc-comments` rule (see `eslint-rules/`),
 * which bans `//` line comments and non-JSDoc `/* *\/` block comments.
 */
const localCommentRules = {
  'local/no-non-doc-comments': 'error',
}

/**
 * The three comment-policy rule groups this wave introduces, combined into
 * one named object for reuse across the config below.
 */
const commentPolicyRules = {
  ...jsdocRules,
  ...eslintCommentsRules,
  ...localCommentRules,
}

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
  react.configs.flat['jsx-runtime'],
  {
    /**
     * Explicit plugin registration + rules extraction instead of spreading
     * `reactHooks.configs['recommended-latest']` directly: combining that
     * object as-is with a typescript-eslint `extends` block elsewhere in
     * this same config array corrupts its `plugins` field down to the
     * legacy eslintrc array shape (`['react-hooks']`) by the time ESLint
     * validates the full config, which then throws "plugins key defined as
     * an array of strings". Unclear which package's flat-config resolution
     * causes it; this sidesteps it entirely.
     */
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
      /**
       * `lib/utils.ts` is shadcn/ui's own generated convention
       * (`components.json` `aliases.utils` -> `@/lib/utils`) — renaming it
       * would fight every future `shadcn add`. `scripts/lint-docs.ts`
       * mirrors `.github/workflows/lint-docs.yml`'s name (and
       * andryore-dev's own `scripts/lint-docs.ts`) — renaming it would
       * break that parity. `eslint-rules/no-non-doc-comments.mjs` and its
       * `local/no-non-doc-comments` rule id are named to match this
       * ticket's (AO-837) spec verbatim.
       */
      'unicorn/name-replacements': [
        'error',
        { allowList: { utils: true, docs: true, doc: true } },
      ],
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
      'shadcn/no-restyle': [
        'error',
        { allow: ['layout'], contracts: shadcnNoRestyleContracts },
      ],
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
          allowedStrings: JSX_NO_LITERALS_ALLOWED_STRINGS,
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    /**
     * Playwright fixtures (`e2e/fixtures.ts`) take a `use` callback per the
     * `@playwright/test` fixture API — an unrelated naming collision with
     * React's `use` hook that `react-hooks/rules-of-hooks` otherwise flags
     * as a misplaced hook call.
     */
    files: ['e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    /**
     * The comment-policy rule groups (local `no-non-doc-comments`,
     * `eslint-plugin-jsdoc`'s TypeScript-flavored recommended rules plus
     * `jsdoc/informative-docs`, and `@eslint-community/eslint-comments`'s
     * recommended rules plus `require-description`) — banning non-doc
     * comments and uninformative or undescribed directive comments.
     * `components/ui/**` is permanently exempt (shadcn-generated,
     * untouched).
     */
    files: ['**/*.{ts,tsx,mjs}'],
    ignores: ['components/ui/**'],
    plugins: {
      jsdoc: jsdoc.configs['flat/recommended-typescript-error'].plugins.jsdoc,
      local: localPlugin,
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: commentPolicyRules,
  },
  prettierConfig,
  globalIgnores(['.output/**', '.wxt/**', 'coverage/**', '.claude/skills/**']),
])

export default eslintConfig
