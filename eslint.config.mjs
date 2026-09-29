import { plugin as shadcn } from '@shadcn/lint'
import vitest from '@vitest/eslint-plugin'
import prettierConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

import wxtAutoImports from './.wxt/eslint-auto-imports.mjs'

// Punctuation/symbol-only JSX text that `react/jsx-no-literals` would
// otherwise flag as copy — none of these carry translatable meaning.
const JSX_NO_LITERALS_ALLOWED_STRINGS = [
  '/',
  // The exported HTML file's fixed extension — a technical suffix, not
  // translatable copy.
  '.html',
  '—',
]

// Per-component exceptions to `shadcn/no-restyle`, each encoding one real,
// bounded design decision rather than disabling the rule outright.
const shadcnNoRestyleContracts = [
  {
    // The popup/dialog UI has no responsive breakpoints, so every Input
    // locks in the `md:` text-sm size instead of also carrying the
    // mobile-only text-base. A few inputs also overlay a leading icon and
    // need matching start padding to keep typed text clear of it.
    pattern: '^Input$',
    allow: ['layout', 'text-sm', 'pl-8'],
  },
  {
    // The time-picker's Hours/Minutes/Period captions intentionally use a
    // smaller, muted treatment instead of Label's default typography —
    // there is no dedicated caption variant for this yet.
    pattern: '^Label$',
    allow: ['layout', 'text-xs', 'text-muted-foreground'],
  },
  {
    // FeatureCard renders a deliberately compact title/description scale
    // (bolder + smaller than Card's own defaults) to fit four cards in the
    // welcome page grid.
    pattern: '^CardTitle$',
    allow: ['layout', 'text-sm', 'font-semibold'],
  },
  {
    pattern: '^CardDescription$',
    allow: ['layout', 'text-xs'],
  },
  {
    // `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (components/ui/tabs.tsx)
    // need consumer-provided layout/spacing classes (flex sizing, width,
    // the `data-[state=inactive]:hidden` visibility hook used to keep every
    // tab mounted, the settings-dialog's own vertical rhythm) to fill the
    // popup's fixed viewport — there is no parent element to push them onto,
    // since these primitives themselves define the flex/grid context their
    // own layout classes participate in.
    pattern: '^Tabs(List|Trigger|Content)?$',
    allow: ['layout', 'spacing', 'space-y-4', 'pt-2'],
  },
]

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
  prettierConfig,
  globalIgnores(['.output/**', '.wxt/**', 'coverage/**']),
])

export default eslintConfig
