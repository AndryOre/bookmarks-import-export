// @vitest-environment jsdom
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { toast } from '@/components/ui/toast'
import { APP_ROUTES, getAppUrl } from '@/lib/app-url'
import { IMPORT_LOCK_NAME } from '@/lib/import-lock'
import { POPUP_IMPORT_BOOKMARK_LIMIT } from '@/lib/popup-import-plan'
import type * as RunImportNamespace from '@/lib/run-import'
import { runImport } from '@/lib/run-import'
import { defaultImportModeStore } from '@/lib/storage'
import { createDomHarness } from '@/lib/testing/dom-harness'
import type { DomHarness } from '@/lib/testing/dom-harness'
import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { ImportSection } from './import-section'

type RunImportModule = typeof RunImportNamespace

vi.mock('@/lib/run-import', async (importOriginal) => {
  const original = await importOriginal<RunImportModule>()
  return { ...original, runImport: vi.fn(original.runImport) }
})

vi.mock('@/components/ui/toast', () => ({ toast: { add: vi.fn() } }))

const runImportMock = vi.mocked(runImport)
const toastAddMock = vi.mocked(toast.add)
const mountedHarnesses: DomHarness[] = []

function csvFile(count: number, hostPrefix = 'new'): File {
  const rows = Array.from(
    { length: count },
    (_, index) => `B${index},https://${hostPrefix}-${index}.example/page`,
  )
  return new File([['title,url', ...rows].join('\n')], 'bookmarks.csv', {
    type: 'text/csv',
  })
}

function deferredTextFile(file: File): {
  file: File
  release: () => void
} {
  const original = file.text.bind(file)
  const { promise: gate, resolve: release } = Promise.withResolvers<void>()
  Object.defineProperty(file, 'text', {
    value: async () => {
      await gate
      return original()
    },
  })
  return { file, release }
}

async function mountSection() {
  const harness = createDomHarness()
  mountedHarnesses.push(harness)
  await harness.render(createElement(ImportSection))
  const input =
    harness.container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input missing')
  return { harness, input }
}

function chooseFileButton(harness: DomHarness): HTMLButtonElement {
  const button = [...harness.container.querySelectorAll('button')].find(
    (candidate) =>
      /popup_chooseFile|popup_importing/.test(candidate.textContent ?? ''),
  )
  if (!button) throw new Error('choose file button missing')
  return button
}

async function pick(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })
}

beforeEach(async () => {
  fakeBrowser.reset()
  resetFakeBookmarks()
  seedFakeBookmarksTree([
    {
      id: 'seed',
      title: 'Existing',
      url: 'https://existing.example/page',
      syncing: false,
    },
  ])
  fakeBrowser.i18n.getMessage = vi.fn(
    (key: string) => key,
  ) as typeof fakeBrowser.i18n.getMessage
  vi.spyOn(fakeBrowser.tabs, 'create').mockResolvedValue(undefined as never)
  runImportMock.mockClear()
  toastAddMock.mockClear()
  await defaultImportModeStore.setValue('folder')
})

afterEach(() => {
  for (const harness of mountedHarnesses.splice(0)) harness.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('popup ImportSection', () => {
  it('disables Choose file as soon as a file is picked and runs one import for two quick picks', async () => {
    const { harness, input } = await mountSection()
    const first = deferredTextFile(csvFile(2))
    const second = csvFile(2, 'other')

    await pick(input, first.file)
    expect(chooseFileButton(harness).disabled).toBe(true)

    await pick(input, second)
    first.release()
    await settle()

    expect(runImportMock).toHaveBeenCalledTimes(1)
    expect(chooseFileButton(harness).disabled).toBe(false)
  })

  it('opens the App Import page and imports nothing above the size threshold', async () => {
    const { harness, input } = await mountSection()

    await pick(input, csvFile(POPUP_IMPORT_BOOKMARK_LIMIT + 1))
    await settle()

    expect(fakeBrowser.tabs.create).toHaveBeenCalledWith({
      url: getAppUrl(APP_ROUTES.import),
    })
    expect(runImportMock).not.toHaveBeenCalled()
    expect(chooseFileButton(harness).disabled).toBe(false)
  })

  it('creates nothing and explains when every bookmark is a duplicate', async () => {
    const { input } = await mountSection()
    const file = new File(
      ['title,url\nDup,https://existing.example/page'],
      'a.csv',
      {
        type: 'text/csv',
      },
    )

    await pick(input, file)
    await settle()

    expect(runImportMock).not.toHaveBeenCalled()
    expect(toastAddMock).toHaveBeenCalledTimes(1)
    expect(toastAddMock.mock.calls[0]?.[0]).toMatchObject({
      title: 'import_nothingToImportTitle',
      description: 'import_allDuplicates',
    })
    expect(toastAddMock.mock.calls[0]?.[0]).not.toMatchObject({
      type: 'success',
    })
  })

  it('shows the lock error when another import holds the shared lock', async () => {
    const { input } = await mountSection()
    const { promise: lockHeld, resolve: releaseLock } =
      Promise.withResolvers<void>()
    const holder = navigator.locks.request(IMPORT_LOCK_NAME, () => lockHeld)
    await Promise.resolve()

    await pick(input, csvFile(2))
    await settle()
    releaseLock()
    await holder

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        description: 'importAnotherRunning',
      }),
    )
  })
})
