/**
 * The extension's published Chrome Web Store item ID. Stable across listing
 * renames, unlike the store slug embedded in {@link CHROME_WEB_STORE_URL}'s
 * alternate, human-readable URL form.
 */
export const CHROME_WEB_STORE_EXTENSION_ID = 'gdhpeilfkeeajillmcncaelnppiakjhn'

/**
 * The Chrome Web Store listing URL, in its slugless form
 * (`.../detail/<extension-id>`). Chrome redirects this form to the
 * slugged URL, so it keeps working even after the listing's name — and
 * therefore its slug — changes.
 */
export const CHROME_WEB_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_WEB_STORE_EXTENSION_ID}`

/**
 * The product name. Never translated, so every locale's `extensionName`
 * message must equal it.
 */
export const PRODUCT_NAME = 'Snug'

/**
 * The project's GitHub repository URL.
 */
export const GITHUB_URL = 'https://github.com/AndryOre/snug'

/**
 * The project's X (formerly Twitter) profile URL.
 */
export const TWITTER_URL = 'https://x.com/andryore'
