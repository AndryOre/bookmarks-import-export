import { fakeBrowser } from 'wxt/testing/fake-browser'

import enMessages from '@/locales/en.json'

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
 */

interface MessageEntry {
  message: string
  description?: string
  placeholders?: Record<string, { content: string }>
}

const messages = enMessages as Record<string, MessageEntry>

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
 * Installs a `locales/en.json`-backed `browser.i18n.getMessage` fake.
 */
export function resetFakeI18n(): void {
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
    return resolveMessage(entry, subs)
  }) as typeof fakeBrowser.i18n.getMessage
}
