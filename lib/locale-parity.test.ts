import { describe, expect, it } from 'vitest'

import enMessages from '@/locales/en.json'
import esMessages from '@/locales/es.json'

/**
 * `description` is a translator note, not shipped copy, so it's excluded from
 * the comparison — locales are allowed to diverge there (today `en.json` has
 * a `changelog_1_2_0_date` description that `es.json` lacks).
 */
function messageKeys(messages: Record<string, unknown>): string[] {
  return Object.keys(messages).toSorted((a, b) => a.localeCompare(b))
}

describe('locale key parity', () => {
  it('has the same top-level message keys in en.json and es.json', () => {
    expect(messageKeys(esMessages)).toEqual(messageKeys(enMessages))
  })
})
