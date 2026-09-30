/**
 * Prefixes that mark a comment as a machine-readable directive — for
 * ESLint (`eslint`, `eslint-disable*`, `eslint-enable`, `global`), the
 * TypeScript compiler (`@ts-*`), Prettier (`prettier-ignore`), or Vitest
 * (`@vitest-environment`) — rather than prose this rule should police.
 */
const ALLOWED_DIRECTIVE_PREFIXES = [
  'eslint',
  'global',
  '@ts-',
  'prettier-ignore',
  '@vitest-environment',
]

/**
 * The exact prefix (including its two/three leading slashes) of a
 * TypeScript triple-slash reference directive, e.g.
 * `/// <reference types="vite/client" />`.
 */
const TRIPLE_SLASH_REFERENCE_PREFIX = '/// <reference'

/**
 * Reports whether a comment's text starts with one of the directive
 * prefixes this rule always allows, regardless of comment kind.
 * @param commentText The comment's text, excluding its delimiters (an
 *   ESLint `comment.value`).
 * @returns Whether the comment is an allowed directive.
 */
function startsWithAllowedDirective(commentText) {
  const trimmed = commentText.trim()
  return ALLOWED_DIRECTIVE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

/**
 * ESLint rule banning every `//` line comment and every `/* *\/` block
 * comment that isn't JSDoc, so the codebase documents non-obvious exports
 * with TSDoc instead of scattering prose comments. Directive comments
 * (`eslint-disable`, `@ts-expect-error`, `prettier-ignore`,
 * `@vitest-environment`, triple-slash references, ...) are exempt, since
 * they're read by tooling rather than humans. Registered as
 * `local/no-non-doc-comments` in `eslint.config.mjs`.
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow // and non-JSDoc /* */ comments in favor of TSDoc or deletion.',
    },
    schema: [],
    messages: {
      noNonDocComment:
        'Write this as a TSDoc comment (/** ... */) on the declaration it documents, or delete it.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (startsWithAllowedDirective(comment.value)) {
            continue
          }

          if (comment.type === 'Line') {
            const rawText = sourceCode.getText(comment)
            if (rawText.startsWith(TRIPLE_SLASH_REFERENCE_PREFIX)) {
              continue
            }
            context.report({ node: comment, messageId: 'noNonDocComment' })
            continue
          }

          if (comment.type === 'Block' && !comment.value.startsWith('*')) {
            context.report({ node: comment, messageId: 'noNonDocComment' })
          }
        }
      },
    }
  },
}

export default rule
