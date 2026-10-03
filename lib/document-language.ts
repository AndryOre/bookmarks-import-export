/**
 * Sets `<html lang>` to the browser UI language so screen readers pick the
 * matching voice; the static HTML ships with `en` as a placeholder. An empty
 * language leaves the existing value untouched.
 */
export function applyDocumentLanguage(): void {
  const language = browser.i18n.getUILanguage()
  if (language === '') return
  document.documentElement.lang = language
}
