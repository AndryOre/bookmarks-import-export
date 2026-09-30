import type { Rule } from 'eslint'

/**
 * Type declaration for `./no-non-doc-comments.mjs`, needed because this
 * module is imported from `no-non-doc-comments.test.ts` and TypeScript
 * cannot infer types across a `.ts` -> `.mjs` import without one.
 */
declare const rule: Rule.RuleModule

export default rule
