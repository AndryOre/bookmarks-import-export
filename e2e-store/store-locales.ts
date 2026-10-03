/**
 * A locale the store screenshots are generated for: the `locales/<code>.json`
 * folder name and the BCP 47 tag Chromium is launched with.
 */
export type StoreLocale = { code: string; browserLocale: string }

/**
 * The ten locales Snug ships, in the order the Playwright projects run.
 */
export const STORE_LOCALES: readonly StoreLocale[] = [
  { code: 'en', browserLocale: 'en' },
  { code: 'es', browserLocale: 'es' },
  { code: 'de', browserLocale: 'de' },
  { code: 'fr', browserLocale: 'fr' },
  { code: 'it', browserLocale: 'it' },
  { code: 'ja', browserLocale: 'ja' },
  { code: 'ko', browserLocale: 'ko' },
  { code: 'pt_BR', browserLocale: 'pt-BR' },
  { code: 'ru', browserLocale: 'ru' },
  { code: 'zh_CN', browserLocale: 'zh-CN' },
]
