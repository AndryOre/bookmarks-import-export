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

const locales = new Map(
  Object.entries(localeModules).map(([path, messages]) => [
    localeCode(path),
    messages,
  ]),
)
const sourceMessages: LocaleMessages = locales.get(SOURCE_LOCALE) ?? {}
const translatedLocales = locales
  .entries()
  .filter(([code]) => code !== SOURCE_LOCALE)
  .toArray()

describe('locale parity', () => {
  it('finds the source locale and at least one translation', () => {
    expect(Object.keys(sourceMessages).length).toBeGreaterThan(0)
    expect(translatedLocales.length).toBeGreaterThanOrEqual(1)
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
