import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { exportBookmarks } from '@/lib/export-all-bookmarks'
import { ExportCanceledError, type ExportProgress } from '@/lib/export-control'
import { resetFakeBookmarks } from '@/lib/testing/fake-bookmarks'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

interface FakeAnchor {
  href: string
  download: string
  click: () => void
  remove: () => void
}

const selection: ExtendedBookmarkTreeNode[] = [
  {
    id: '10',
    title: 'Folder',
    syncing: false,
    children: [
      { id: '11', title: 'One', syncing: false, url: 'https://one.example' },
      { id: '12', title: 'Two', syncing: false, url: 'https://two.example' },
    ],
  },
  { id: '13', title: 'Three', syncing: false, url: 'https://three.example' },
]

const anchors: FakeAnchor[] = []
const blobs: Blob[] = []

beforeEach(() => {
  resetFakeBookmarks()
  anchors.length = 0
  blobs.length = 0
  vi.stubGlobal('document', {
    createElement: () => {
      const anchor: FakeAnchor = {
        href: '',
        download: '',
        click: () => {},
        remove: () => {},
      }
      anchors.push(anchor)
      return anchor
    },
    body: { append: () => {} },
  })
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      blobs.push(blob)
      return 'blob:fake'
    },
    revokeObjectURL: () => {},
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exportBookmarks', () => {
  it('exports only the given selection and reports its bookmark count', async () => {
    const result = await exportBookmarks('json', selection)

    expect(result.count).toBe(3)
    expect(result.fileName.endsWith('.json')).toBe(true)
    expect(anchors[0]?.download).toBe(result.fileName)

    const content = await blobs[0]?.text()
    expect(content).toContain('Three')
    expect(content).toContain('two.example')
  })

  it('uses the extension that matches the format', async () => {
    const result = await exportBookmarks('csv', selection)

    expect(result.fileName.endsWith('.csv')).toBe(true)
  })

  it('reports done and total bookmark counts', async () => {
    const events: ExportProgress[] = []

    await exportBookmarks('json', selection, {
      onProgress: (progress) => {
        events.push(progress)
      },
    })

    expect(events).toEqual([{ done: 3, total: 3 }])
  })

  for (const format of ['json', 'html', 'csv'] as const) {
    it(`produces no download when canceled mid-export (${format})`, async () => {
      const controller = new AbortController()
      const events: ExportProgress[] = []
      const many: ExtendedBookmarkTreeNode[] = Array.from(
        { length: 60 },
        (_, index) => ({
          id: `b${index}`,
          title: `Bookmark ${index}`,
          syncing: false,
          url: `https://example.com/${index}`,
        }),
      )

      await expect(
        exportBookmarks(format, many, {
          signal: controller.signal,
          onProgress: (progress) => {
            events.push(progress)
            controller.abort()
          },
        }),
      ).rejects.toBeInstanceOf(ExportCanceledError)

      expect(events[0]).toEqual({ done: 25, total: 60 })
      expect(anchors).toHaveLength(0)
      expect(blobs).toHaveLength(0)
    })
  }
})
