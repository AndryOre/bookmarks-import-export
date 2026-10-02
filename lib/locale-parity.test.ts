import { describe, expect, it } from 'vitest'

interface LocaleEntry {
  message: string
  description?: string
  placeholders?: Record<string, unknown>
}

type LocaleMessages = Record<string, LocaleEntry>

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
 * `description` is a translator note, not shipped copy, so it is excluded from
 * the comparison.
 * @param entry A single message entry.
 * @returns The sorted placeholder names, empty when there are none.
 */
function placeholderNames(entry: LocaleEntry): string[] {
  return Object.keys(entry.placeholders ?? {}).toSorted((a, b) =>
    a.localeCompare(b),
  )
}

/**
 * @param entry A single message entry.
 * @returns The declared placeholder names whose `$NAME$` token is absent from
 * the message text (compared case-insensitively, as Chrome does).
 */
function missingPlaceholderTokens(entry: LocaleEntry): string[] {
  return Object.keys(entry.placeholders ?? {}).filter(
    (name) => !entry.message.toLowerCase().includes(`$${name.toLowerCase()}$`),
  )
}

/**
 * @param messages A whole locale file.
 * @returns Human-readable problems: empty messages and unused placeholders.
 */
function findContentProblems(messages: LocaleMessages): string[] {
  return Object.entries(messages).flatMap(([key, entry]) => [
    ...(entry.message.trim() === '' ? [`${key}: empty message`] : []),
    ...missingPlaceholderTokens(entry).map(
      (name) => `${key}: placeholder $${name}$ missing from message`,
    ),
  ])
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
      const length = messages.extensionDescription?.message.length ?? 0
      expect(length, `${code} extensionDescription length`).toBeGreaterThan(0)
      expect(length, `${code} extensionDescription length`).toBeLessThanOrEqual(
        MAX_DESCRIPTION_LENGTH,
      )
    })
  })
})
