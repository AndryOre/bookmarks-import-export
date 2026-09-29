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
interface PreprocessLevelResult {
  result: ParsedBookmark[]
  orphans: ParsedBookmark[]
  virtualRootChildren: ParsedBookmark[] | undefined
}

function preprocessLevel(level: ParsedBookmark[]): PreprocessLevelResult {
  const result: ParsedBookmark[] = []
  const orphans: ParsedBookmark[] = []
  let virtualRootChildren: ParsedBookmark[] | undefined

  for (const bookmark of level) {
    if (bookmark.id === '1') {
      bookmark.isBookmarksBar = true
      result.unshift(bookmark)
    } else if (bookmark.id === '2') {
      bookmark.isOtherBookmarks = true
      result.push(bookmark)
    } else if (bookmark.parentId === '2') {
      orphans.push(bookmark)
    } else if (bookmark.children) {
      virtualRootChildren = bookmark.children as ParsedBookmark[]
      break
    }
  }

  return { result, orphans, virtualRootChildren }
}

export function preprocessBookmarks(
  bookmarks: ParsedBookmark[],
): ParsedBookmark[] {
  // Nodo raíz virtual id="0": en vez de recursar en sus children, esta
  // iteración avanza `currentLevel` y vuelve a recorrer.
  let currentLevel = bookmarks

  for (;;) {
    const { result, orphans, virtualRootChildren } =
      preprocessLevel(currentLevel)

    if (virtualRootChildren) {
      currentLevel = virtualRootChildren
      continue
    }

    if (orphans.length > 0 && result.every((b) => !b.isOtherBookmarks)) {
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
    const bookmarksBarNode = root.children.at(0)
    const otherBookmarksNode = root.children.at(1)
    const bookmarksBarId = bookmarksBarNode?.id
    const otherBookmarksId = otherBookmarksNode?.id

    if (!bookmarksBarId || !otherBookmarksId) {
      throw new Error('PROCESS_ERROR:' + i18n.t('importFromJSONProcessError'))
    }

    if (mode === 'restore-replace') {
      const bookmarksBarChildren = bookmarksBarNode?.children ?? []
      for (const child of bookmarksBarChildren) {
        await browser.bookmarks.removeTree(child.id)
      }
      const otherBookmarksChildren = otherBookmarksNode?.children ?? []
      for (const child of otherBookmarksChildren) {
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
