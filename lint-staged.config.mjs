const config = {
  '*.{js,jsx,ts,tsx,mjs}': [
    'bunx --bun prettier --write --cache',
    'bunx eslint --fix --max-warnings=0 --no-warn-ignored',
  ],
  '*.{json,json5,md,mdx,css,scss,yml,yaml}': [
    'bunx --bun prettier --write --cache',
  ],
}

export default config
