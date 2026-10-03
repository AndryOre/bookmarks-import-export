const SHIPPED_LOCALES = [
  'de',
  'en',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pt_BR',
  'ru',
  'zh_CN',
] as const

/**
 * Resolves the browser UI language to the locale Snug actually renders,
 * mirroring Chrome's lookup: the exact locale first, then its base language,
 * then English.
 * @param uiLanguage A BCP 47 tag such as `pt-BR` or `de-AT`.
 * @returns The matching shipped locale as a BCP 47 tag (`pt-BR`), or `en`.
 */
function resolveShippedLanguage(uiLanguage: string): string {
  const normalized = uiLanguage.replaceAll('-', '_')
  const [baseLanguage = ''] = normalized.split('_', 1)
  const match = SHIPPED_LOCALES.find(
    (locale) => locale === normalized || locale === baseLanguage,
  )
  return (match ?? 'en').replaceAll('_', '-')
}

/**
 * Sets `<html lang>` to the language the UI is actually rendered in, so
 * screen readers pick the matching voice; the static HTML ships with `en` as a
 * placeholder. Browser languages Snug has no locale for resolve to `en`, the
 * fallback the messages use. An empty language leaves the existing value
 * untouched.
 */
export function applyDocumentLanguage(): void {
  const language = browser.i18n.getUILanguage()
  if (language === '') return
  document.documentElement.lang = resolveShippedLanguage(language)
}
