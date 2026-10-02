import { describe, expect, it } from 'vitest'

interface MessageEntry {
  message: string
  description?: string
  placeholders?: Record<string, unknown>
}

type PluralEntry = Record<string, string>
type LocaleEntry = MessageEntry | PluralEntry
type LocaleMessages = Record<string, LocaleEntry>

const PLURAL_FORM_KEYS = new Set(['0', '1', 'n'])

const SOURCE_LOCALE = 'en'
const MAX_DESCRIPTION_LENGTH = 132

const localeModules = import.meta.glob<LocaleMessages>('../locales/*.json', {
  eager: true,
  import: 'default',
})

/**
 * @param path A glob key such as `../locales/pt_BR.json`.
 * @returns The locale code, such as `pt_BR`.
 */
function localeCode(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '')
}

/**
 * @param entry A single message entry.
 * @returns Whether the entry is a plural message (`{ "1": ..., "n": ... }`)
 * rather than a verbose `{ message, description, placeholders }` one.
 */
function isPluralEntry(entry: LocaleEntry): entry is PluralEntry {
  return typeof entry.message !== 'string'
}

/**
 * @param entry A plural message entry.
 * @returns The sorted, de-duplicated `$1`-`$9` tokens used by any form.
 */
function substitutionTokens(entry: PluralEntry): string[] {
  const tokens = Object.values(entry).flatMap(
    (form) => form.match(/\$\d/g) ?? [],
  )
  return [...new Set(tokens)].toSorted((a, b) => a.localeCompare(b))
}

/**
 * `description` is a translator note, not shipped copy, so it is excluded from
 * the comparison. Plural messages carry no named placeholders; their
 * positional `$N` tokens are compared instead.
 * @param entry A single message entry.
 * @returns The sorted placeholder names, empty when there are none.
 */
function placeholderNames(entry: LocaleEntry): string[] {
  return isPluralEntry(entry)
    ? substitutionTokens(entry)
    : Object.keys(entry.placeholders ?? {}).toSorted((a, b) =>
        a.localeCompare(b),
      )
}

/**
 * @param entry A single message entry.
 * @returns The declared placeholder names whose `$NAME$` token is absent from
 * the message text (compared case-insensitively, as Chrome does).
 */
function missingPlaceholderTokens(entry: MessageEntry): string[] {
  return Object.keys(entry.placeholders ?? {}).filter(
    (name) => !entry.message.toLowerCase().includes(`$${name.toLowerCase()}$`),
  )
}

/**
 * @param messages A whole locale file.
 * @returns Human-readable problems: empty messages and unused placeholders.
 */
function findContentProblems(messages: LocaleMessages): string[] {
  return Object.entries(messages).flatMap(([key, entry]) =>
    isPluralEntry(entry)
      ? findPluralProblems(key, entry)
      : [
          ...(entry.message.trim() === '' ? [`${key}: empty message`] : []),
          ...missingPlaceholderTokens(entry).map(
            (name) => `${key}: placeholder $${name}$ missing from message`,
          ),
        ],
  )
}

/**
 * @param key The message key.
 * @param entry A plural message entry.
 * @returns Problems with the entry: forms other than `0`, `1` and `n`, a
 * missing `n` fallback, or an empty form.
 */
function findPluralProblems(key: string, entry: PluralEntry): string[] {
  const forms = Object.entries(entry)
  return [
    ...forms
      .filter(([form]) => !PLURAL_FORM_KEYS.has(form))
      .map(([form]) => `${key}: unsupported plural form "${form}"`),
    ...(Object.hasOwn(entry, 'n') ? [] : [`${key}: missing "n" plural form`]),
    ...forms
      .filter(([, text]) => text.trim() === '')
      .map(([form]) => `${key}: empty plural form "${form}"`),
  ]
}

const locales = new Map(
  Object.entries(localeModules).map(([path, messages]) => [
    localeCode(path),
    messages,
  ]),
)
const sourceMessages: LocaleMessages = locales.get(SOURCE_LOCALE) ?? {}
const allLocales = locales.entries().toArray()
const translatedLocales = allLocales.filter(([code]) => code !== SOURCE_LOCALE)

describe('locale parity', () => {
  it('finds the source locale and at least one translation', () => {
    expect(Object.keys(sourceMessages).length).toBeGreaterThan(0)
    expect(translatedLocales.length).toBeGreaterThanOrEqual(1)
  })

  describe('content checks', () => {
    it('flags an empty message', () => {
      expect(findContentProblems({ a: { message: '  ' } })).toEqual([
        'a: empty message',
      ])
    })

    it('flags a declared placeholder missing from the message', () => {
      const fixture = {
        a: {
          message: 'Hello',
          placeholders: { count: { content: '$1' } },
        },
      }
      expect(findContentProblems(fixture)).toEqual([
        'a: placeholder $count$ missing from message',
      ])
    })

    it('accepts a well-formed plural message', () => {
      expect(
        findContentProblems({ a: { '1': '$1 item', n: '$1 items' } }),
      ).toEqual([])
    })

    it('flags a plural message without an "n" form or with an odd form', () => {
      expect(
        findContentProblems({ a: { '1': '$1 item', few: '$1 items' } }),
      ).toEqual([
        'a: unsupported plural form "few"',
        'a: missing "n" plural form',
      ])
    })

    it('accepts a placeholder token in any letter case', () => {
      const fixture = {
        a: {
          message: 'Total $COUNT$',
          placeholders: { count: { content: '$1' } },
        },
      }
      expect(findContentProblems(fixture)).toEqual([])
    })
  })

  describe.each(allLocales)('%s content', (code, messages) => {
    it('has no empty messages and every placeholder token is used', () => {
      expect({ locale: code, problems: findContentProblems(messages) }).toEqual(
        { locale: code, problems: [] },
      )
    })
  })

  describe.each(translatedLocales)('%s', (code, messages) => {
    it(`has the same message keys as ${SOURCE_LOCALE}`, () => {
      const sourceKeys = Object.keys(sourceMessages)
      const keys = Object.keys(messages)
      const missing = sourceKeys.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !sourceKeys.includes(key))
      expect({ locale: code, missing, extra }).toEqual({
        locale: code,
        missing: [],
        extra: [],
      })
    })

    it('uses a plural message exactly where en does', () => {
      const mismatches = Object.entries(sourceMessages)
        .filter(([key]) => Object.hasOwn(messages, key))
        .filter(
          ([key, entry]) =>
            isPluralEntry(entry) !== isPluralEntry(messages[key] ?? {}),
        )
        .map(([key]) => ({ locale: code, key }))
      expect(mismatches).toEqual([])
    })

    it('has the same placeholder names per key', () => {
      const mismatches = Object.entries(sourceMessages)
        .filter(([key]) => Object.hasOwn(messages, key))
        .map(([key, entry]) => ({
          locale: code,
          key,
          expected: placeholderNames(entry),
          actual: placeholderNames(messages[key] ?? { message: '' }),
        }))
        .filter(
          ({ expected, actual }) => expected.join(',') !== actual.join(','),
        )
      expect(mismatches).toEqual([])
    })

    it(`keeps extensionDescription within ${MAX_DESCRIPTION_LENGTH} characters`, () => {
      const description = messages.extensionDescription
      const length =
        description && !isPluralEntry(description)
          ? description.message.length
          : 0
      expect(length, `${code} extensionDescription length`).toBeGreaterThan(0)
      expect(length, `${code} extensionDescription length`).toBeLessThanOrEqual(
        MAX_DESCRIPTION_LENGTH,
      )
    })
  })
})
