// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetFakeBookmarks,
  seedFakeBookmarksTree,
} from '@/lib/testing/fake-bookmarks'

import { exportToXBEL } from './export-xbel'

const baseOptions = {
  includeDateAdded: false,
  includeDateLastUsed: false,
  includeDateGroupModified: false,
  hideOtherBookmarks: false,
  hideParentFolder: false,
}

beforeEach(() => {
  resetFakeBookmarks()
})

function parse(xml: string): Document {
  const document_ = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document_.querySelector('parsererror')).toBeNull()
  return document_
}

describe('exportToXBEL', () => {
  it('produces a well-formed XBEL 1.0 document for an empty tree', async () => {
    const xml = await exportToXBEL({ selectedBookmarks: null, ...baseOptions })
    const document_ = parse(xml)

    expect(xml).toContain('<!DOCTYPE xbel')
    expect(document_.documentElement.nodeName).toBe('xbel')
    expect(document_.documentElement.getAttribute('version')).toBe('1.0')
  })

  it('nests folders, titles and bookmarks and escapes special characters', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Tools & "Stuff"',
          syncing: false,
          children: [
            {
              id: '11',
              parentId: '10',
              title: '<i>x</i> & y',
              url: 'https://example.com/?a=1&b="2"',
              syncing: false,
            },
            {
              id: '12',
              parentId: '10',
              title: 'Empty',
              syncing: false,
              children: [],
            },
          ],
        },
      ],
      [],
    )

    const document_ = parse(
      await exportToXBEL({ selectedBookmarks: null, ...baseOptions }),
    )

    const folders = [
      ...document_.documentElement.querySelectorAll(':scope > folder > folder'),
    ]
    const tools = folders.find(
      (folder) =>
        folder.querySelector(':scope > title')?.textContent ===
        'Tools & "Stuff"',
    )
    expect(tools).toBeDefined()
    const bookmark = tools?.querySelector(':scope > bookmark')
    expect(bookmark?.getAttribute('href')).toBe(
      'https://example.com/?a=1&b="2"',
    )
    expect(bookmark?.querySelector('title')?.textContent).toBe('<i>x</i> & y')
    const empty = [...(tools?.querySelectorAll(':scope > folder') ?? [])][0]
    expect(empty?.querySelector('title')?.textContent).toBe('Empty')
    expect(empty?.querySelector('bookmark')).toBeNull()
  })

  it('writes ISO dates only for enabled options', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Timed',
          url: 'https://example.com',
          syncing: false,
          dateAdded: 1_700_000_000_000,
          dateLastUsed: 1_700_000_100_000,
        },
      ],
      [],
    )

    const withDates = parse(
      await exportToXBEL({
        selectedBookmarks: null,
        ...baseOptions,
        includeDateAdded: true,
        includeDateLastUsed: true,
      }),
    ).querySelector('bookmark')
    expect(withDates?.getAttribute('added')).toBe('2023-11-14T22:13:20.000Z')
    expect(withDates?.getAttribute('visited')).toBe('2023-11-14T22:15:00.000Z')

    const without = parse(
      await exportToXBEL({ selectedBookmarks: null, ...baseOptions }),
    ).querySelector('bookmark')
    expect(without?.hasAttribute('added')).toBe(false)
  })

  it('never writes a folder-level modified attribute, which the XBEL 1.0 DTD does not allow', async () => {
    seedFakeBookmarksTree(
      [
        {
          id: '10',
          parentId: '1',
          title: 'Folder',
          syncing: false,
          dateAdded: 1_700_000_000_000,
          dateGroupModified: 1_700_000_200_000,
          children: [],
        },
      ],
      [],
    )

    const folder = parse(
      await exportToXBEL({
        selectedBookmarks: null,
        ...baseOptions,
        includeDateAdded: true,
        includeDateGroupModified: true,
      }),
    ).querySelector('folder')
    expect(folder?.hasAttribute('added')).toBe(true)
    expect(folder?.hasAttribute('modified')).toBe(false)
  })

  it('exports only the selection and flattens hidden folders', async () => {
    const document_ = parse(
      await exportToXBEL({
        selectedBookmarks: [
          {
            id: '10',
            parentId: '1',
            title: 'Picked',
            syncing: false,
            children: [
              {
                id: '11',
                parentId: '10',
                title: 'Inside',
                url: 'https://example.com',
                syncing: false,
              },
            ],
          },
        ],
        ...baseOptions,
        hideParentFolder: true,
      }),
    )

    expect(document_.querySelector('folder')).toBeNull()
    expect(
      document_.documentElement.querySelectorAll(':scope > bookmark'),
    ).toHaveLength(1)
  })
})
