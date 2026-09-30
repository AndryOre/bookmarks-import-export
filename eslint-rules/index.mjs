import rule from './no-non-doc-comments.mjs'

/**
 * This repo's local ESLint plugin, registered in `eslint.config.mjs` under
 * the `local` namespace (e.g. `local/no-non-doc-comments`).
 */
const localPlugin = {
  rules: {
    'no-non-doc-comments': rule,
  },
}

export default localPlugin
