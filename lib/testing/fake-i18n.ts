import { fakeBrowser } from 'wxt/testing/fake-browser'

/**
 * `@webext-core/fake-browser` does not implement `browser.i18n.getMessage`
 * either (same "mock it yourself" story as bookmarks — see fake-bookmarks.ts).
 * `#i18n`'s `i18n.t()` calls `browser.i18n.getMessage` under the hood, so any
 * `lib/**` code that uses `i18n.t()` (exporters, importers, favicon) needs
 * this patched in, or it throws.
 *
 * Reimplements just enough of Chrome's message-substitution format
 * (`$PLACEHOLDER_NAME$` tokens resolved through each message's
 * `placeholders[name].content`, e.g. `"$1"`) to resolve `locales/en.json`
 * against the positional substitutions `i18n.t(key, [subs])` passes along.
 *
 * Plural messages (`{ "1": ..., "n": ... }` in `locales/*.json`) are flattened
 * to the `a | b | c` string `@wxt-dev/i18n` generates for Chrome at build
 * time, with bare `$1`-`$9` tokens resolved from the substitutions;
 * `i18n.t(key, count, ...)` then picks the form itself.
 */

const DEFAULT_LOCALE = 'en'

interface MessageEntry {
  message: string
  description?: string
  placeholders?: Record<string, { content: string }>
}

type PluralEntry = Record<string, string>
type LocaleEntry = MessageEntry | PluralEntry

const localeModules = import.meta.glob<Record<string, LocaleEntry>>(
  '../../locales/*.json',
  { eager: true, import: 'default' },
)

function isMessageEntry(entry: LocaleEntry): entry is MessageEntry {
  return typeof entry.message === 'string'
}

function loadLocale(locale: string): Record<string, LocaleEntry> {
  const match = Object.entries(localeModules).find(([path]) =>
    path.endsWith(`/${locale}.json`),
  )
  if (!match) throw new Error(`Unknown locale: ${locale}`)
  return match[1]
}

function resolvePlural(entry: PluralEntry, substitutions?: string[]): string {
  return Object.values(entry)
    .join(' | ')
    .replaceAll(
      /\$(\d)/g,
      (_token, digit: string) => substitutions?.[Number(digit) - 1] ?? '',
    )
}

function resolveMessage(entry: MessageEntry, substitutions?: string[]): string {
  let text = entry.message
  if (!entry.placeholders) return text

  for (const [name, { content }] of Object.entries(entry.placeholders)) {
    const token = new RegExp(String.raw`\$${name}\$`, 'gi')
    const ordinal = /^\$(\d+)$/.exec(content)
    const value = ordinal
      ? (substitutions?.[Number(ordinal[1]) - 1] ?? '')
      : content
    text = text.replace(token, () => value)
  }
  return text
}

/**
 * Installs a `locales/<locale>.json`-backed `browser.i18n.getMessage` fake.
 * @param locale The locale file to serve, `en` by default.
 */
export function resetFakeI18n(locale: string = DEFAULT_LOCALE): void {
  const messages = loadLocale(locale)
  fakeBrowser.i18n.getMessage = ((
    messageName: string,
    substitutions?: string | string[],
  ) => {
    const entry = messages[messageName]
    if (!entry) return ''
    const subs = substitutions
      ? Array.isArray(substitutions)
        ? substitutions
        : [substitutions]
      : undefined
    return isMessageEntry(entry)
      ? resolveMessage(entry, subs)
      : resolvePlural(entry, subs)
  }) as typeof fakeBrowser.i18n.getMessage
}
