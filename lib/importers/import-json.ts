import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import type { ImportMode, ParsedBookmark } from '@/lib/types'

export async function importFromJSON(
  bookmarks: ParsedBookmark[],
  mode: ImportMode = 'folder',
): Promise<void> {
  try {
    const preprocessed = preprocessBookmarks(bookmarks)
    await processBookmarks(preprocessed, mode)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw new Error(i18n.t('importFromJSONProcessError'))
    }
    throw new Error(
      i18n.t('importFromJSONImportError', [(error as Error).message]),
    )
  }
}

// ── Fase 1: Preprocesamiento ──────────────────────────────────────────────────

/**
 * Normaliza el array de nivel superior del JSON exportado a [ bookmarksBar?, otherBookmarks? ].
 * Maneja: nodo raíz id="0", ids explícitos "1"/"2", y nodos huérfanos con parentId="2".
 */
export function preprocessBookmarks(
  bookmarks: ParsedBookmark[],
): ParsedBookmark[] {
  const result: ParsedBookmark[] = []
  const orphans: ParsedBookmark[] = []

  for (const bookmark of bookmarks) {
    if (bookmark.id === '1') {
      bookmark.isBookmarksBar = true
      result.unshift(bookmark)
    } else if (bookmark.id === '2') {
      bookmark.isOtherBookmarks = true
      result.push(bookmark)
    } else if (bookmark.parentId === '2') {
      orphans.push(bookmark)
    } else {
      // Nodo raíz virtual id="0": recursar en sus children
      if (bookmark.children) {
        return preprocessBookmarks(bookmark.children as ParsedBookmark[])
      }
    }
  }

  if (orphans.length > 0 && !result.some((b) => b.isOtherBookmarks)) {
    result.push({
      id: '2',
      isOtherBookmarks: true,
      title: i18n.t('otherBookmarks'),
      dateAdded: Date.now(),
      children: orphans,
    })
  }

  return result
}

// ── Fase 2: Creación en Chrome ────────────────────────────────────────────────

async function processBookmarks(
  parsed: ParsedBookmark[],
  mode: ImportMode,
): Promise<void> {
  const tree = await browser.bookmarks.getTree()
  const root = tree[0]

  if (!root?.children?.[0] || !root.children?.[1]) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromJSONProcessError'))
  }

  if (mode === 'folder') {
    const importedFolder = await createItem({
      title: i18n.t('importedBookmarks'),
    })

    for (const bookmark of parsed) {
      if (
        bookmark.isBookmarksBar &&
        bookmark.children &&
        bookmark.children.length > 0
      ) {
        const importedBar = await createItem({
          parentId: importedFolder.id,
          title: i18n.t('bookmarksBar'),
        })
        await createBookmarks(bookmark.children, importedBar.id)
      } else if (bookmark.isOtherBookmarks && bookmark.children) {
        await createBookmarks(bookmark.children, importedFolder.id)
      } else if (bookmark.url) {
        await createItem({
          parentId: importedFolder.id,
          title: bookmark.title,
          url: bookmark.url,
        })
      }
    }
  } else {
    const bookmarksBarId = root.children[0].id
    const otherBookmarksId = root.children[1].id

    if (mode === 'restore-replace') {
      for (const child of root.children[0].children ?? []) {
        await browser.bookmarks.removeTree(child.id)
      }
      for (const child of root.children[1].children ?? []) {
        await browser.bookmarks.removeTree(child.id)
      }
    }

    for (const bookmark of parsed) {
      if (bookmark.isBookmarksBar && bookmark.children) {
        await createBookmarks(bookmark.children, bookmarksBarId)
      } else if (bookmark.isOtherBookmarks && bookmark.children) {
        await createBookmarks(bookmark.children, otherBookmarksId)
      } else if (bookmark.url) {
        await createItem({
          parentId: otherBookmarksId,
          title: bookmark.title,
          url: bookmark.url,
        })
      }
    }
  }
}

async function createBookmarks(
  nodes: ParsedBookmark[],
  parentId: string,
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await createItem({ parentId, title: node.title, url: node.url })
    } else if (node.children && node.children.length > 0) {
      const folder = await createItem({ parentId, title: node.title })
      await createBookmarks(node.children, folder.id)
    }
    // Carpetas vacías se ignoran
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails,
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details)
}
