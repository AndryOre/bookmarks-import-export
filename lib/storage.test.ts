import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  autoExportConfigStore,
  defaultImportModeStore,
  exportFilenameTemplateStore,
  hideOtherBookmarksStore,
  lastExportFormatStore,
  lastSeenVersionStore,
  showBookmarkIconStore,
  themeStore,
} from './storage'

describe('storage items', () => {
  beforeEach(() => {
    fakeBrowser.reset()
  })

  it.each([
    ['theme', themeStore, 'system'],
    ['showBookmarkIcon', showBookmarkIconStore, true],
    ['hideOtherBookmarks', hideOtherBookmarksStore, true],
    ['lastExportFormat', lastExportFormatStore, 'html'],
    ['lastSeenVersion', lastSeenVersionStore, null],
    ['defaultImportMode', defaultImportModeStore, 'restore-merge'],
    [
      'exportFilenameTemplate',
      exportFilenameTemplateStore,
      'Bookmarks_%yyyy-%mm-%dd_%hh-%min-%sec',
    ],
  ] as const)('%s falls back to its default', async (_name, item, expected) => {
    expect(await item.getValue()).toEqual(expected)
  })

  it('defaults auto-export to disabled, daily, html', async () => {
    expect(await autoExportConfigStore.getValue()).toEqual({
      enabled: false,
      interval: '1d',
      preferredTime: '00:00',
      dayOfWeek: 1,
      path: 'bookmarks-backup/',
      formats: ['html'],
      keepLast: 10,
    })
  })

  it('migrates a stored config without dayOfWeek, keeping its settings', async () => {
    await fakeBrowser.storage.local.set({
      autoExportConfig: {
        enabled: true,
        interval: '7d',
        preferredTime: '09:30',
        path: 'backups/',
        formats: ['json', 'csv'],
      },
    })

    vi.resetModules()
    const reloaded = await import('./storage')

    expect(await reloaded.autoExportConfigStore.getValue()).toEqual({
      enabled: true,
      interval: '7d',
      preferredTime: '09:30',
      dayOfWeek: 1,
      path: 'backups/',
      formats: ['json', 'csv'],
      keepLast: 10,
    })
  })

  it('persists values under local: keys', async () => {
    await themeStore.setValue('dark')

    expect(await themeStore.getValue()).toBe('dark')
    const rawStorage = await fakeBrowser.storage.local.get('theme')
    expect(rawStorage.theme).toBe('dark')
  })

  it('returns the fallback again after a value is removed', async () => {
    await showBookmarkIconStore.setValue(false)
    await showBookmarkIconStore.removeValue()

    expect(await showBookmarkIconStore.getValue()).toBe(true)
  })

  it('notifies watchers of changes', async () => {
    const seen: unknown[] = []
    const unwatch = themeStore.watch((value) => {
      seen.push(value)
    })

    await themeStore.setValue('light')
    unwatch()

    expect(seen).toEqual(['light'])
  })
})
