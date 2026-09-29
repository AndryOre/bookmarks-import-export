/**
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: 'all',
  semi: false,
  tabWidth: 2,
  singleQuote: true,
  printWidth: 80,
  proseWrap: 'always',
  endOfLine: 'lf',
  arrowParens: 'always',
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  tailwindStylesheet: './entrypoints/popup/style.css',
  tailwindFunctions: ['cn', 'cva', 'clsx'],
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@/(.*)$',
    '^[./]',
    '^@common/(.*)$',
    '^@components/(.*)$',
    '^@contexts/(.*)$',
    '^@hooks/(.*)$',
    '^@/utils/(.*)$',
    '^@storybook/(.*)$',
    '^@/styles/(.*)$',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
}

export default config
