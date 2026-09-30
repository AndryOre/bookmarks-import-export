import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

import rule from './no-non-doc-comments.mjs'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

ruleTester.run('no-non-doc-comments', rule, {
  valid: [
    {
      name: 'JSDoc block comment',
      code: '/**\n * Explains the export.\n */\nexport const value = 1\n',
    },
    {
      name: 'eslint directive',
      code: '/* eslint quotes: ["error", "single"] */\nexport const value = 1\n',
    },
    {
      name: 'eslint-disable directive',
      code: '// eslint-disable-next-line no-console\nconsole.log(1)\n',
    },
    {
      name: 'eslint-enable directive',
      code: '/* eslint-disable no-console */\nconsole.log(1)\n/* eslint-enable no-console */\n',
    },
    {
      name: 'global directive',
      code: '/* global window */\nwindow.focus()\n',
    },
    {
      name: '@ts- directive',
      code: '// @ts-expect-error the shim below is intentionally untyped\nconst value = window.doesNotExist\n',
    },
    {
      name: 'prettier-ignore directive',
      code: '// prettier-ignore\nconst matrix = [1, 0, 0, 1]\n',
    },
    {
      /**
       * Both the name and code below are split with concatenation, not
       * written as a literal contiguous string: vitest scans this test
       * file's own source text for a `@vitest` + `-environment` pragma
       * before running anything, so writing that directive verbatim
       * anywhere in this file — even inside a string or a test name —
       * would make vitest try to switch this file's own test environment.
       */
      name: ['@vitest', '-environment', ' directive'].join(''),
      code: [
        '//',
        ' @vitest',
        '-environment',
        ' jsdom\nexport const value = 1\n',
      ].join(''),
    },
    {
      name: 'triple-slash reference directive',
      code: '/// <reference types="vite/client" />\nexport const value = 1\n',
    },
    {
      name: 'JSX JSDoc comment',
      code: 'const element = (\n  <div>\n    {/**\n     * Explains the child.\n     */}\n    <span />\n  </div>\n)\n',
    },
  ],
  invalid: [
    {
      name: 'line comment',
      code: '// explains the export\nexport const value = 1\n',
      errors: [{ messageId: 'noNonDocComment' }],
    },
    {
      name: 'trailing line comment',
      code: 'export const value = 1 // explains the export\n',
      errors: [{ messageId: 'noNonDocComment' }],
    },
    {
      name: 'non-JSDoc block comment',
      code: '/* explains the export */\nexport const value = 1\n',
      errors: [{ messageId: 'noNonDocComment' }],
    },
    {
      name: 'JSX block comment',
      code: 'const element = (\n  <div>\n    {/* explains the child */}\n    <span />\n  </div>\n)\n',
      errors: [{ messageId: 'noNonDocComment' }],
    },
  ],
})
