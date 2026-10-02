import { i18n } from '#i18n'
import { beforeEach, describe, expect, it } from 'vitest'

import { formatCount } from './format-count'
import { resetFakeI18n } from './testing/fake-i18n'

const COUNTS = [0, 1, 2, 1_234_567] as const

function importLabel(count: number, locale: string): string {
  return i18n.t('import_submit', count, [formatCount(count, locale)])
}

describe('plural messages in en', () => {
  beforeEach(() => {
    resetFakeI18n('en')
  })

  it.each([
    [0, 'Import 0 bookmarks'],
    [1, 'Import 1 bookmark'],
    [2, 'Import 2 bookmarks'],
    [1_234_567, 'Import 1,234,567 bookmarks'],
  ])('import_submit with %d', (count, expected) => {
    expect(importLabel(count, 'en')).toBe(expected)
  })

  it('pluralizes by the removed count and shows both numbers', () => {
    expect(i18n.t('import_replaceDiffTitle', 1, ['1', '5'])).toBe(
      'Replace will remove 1 bookmark and add 5',
    )
    expect(i18n.t('import_replaceDiffTitle', 3, ['3', '1'])).toBe(
      'Replace will remove 3 bookmarks and add 1',
    )
  })
})

describe('plural messages in ru', () => {
  beforeEach(() => {
    resetFakeI18n('ru')
  })

  it.each(COUNTS)('import_submit reads correctly for %d', (count) => {
    const formatted = formatCount(count, 'ru')
    expect(importLabel(count, 'ru')).toBe(
      `Импортировать закладки: ${formatted}`,
    )
  })
})

describe('plural messages in fr', () => {
  beforeEach(() => {
    resetFakeI18n('fr')
  })

  it.each([
    [0, '0 favori'],
    [1, '1 favori'],
    [2, '2 favoris'],
  ])('importPreviewCount with %d', (count, expected) => {
    expect(i18n.t('importPreviewCount', count, [String(count)])).toBe(expected)
  })
})
