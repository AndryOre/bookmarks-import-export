import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import type { ImportMode, ParsedBookmark } from '@/lib/types'

/**
 * Imports bookmarks from a Netscape-format bookmarks HTML export.
 *
 * `mode` controls where the parsed tree is written:
 * - `'folder'`: creates a new "Imported bookmarks" folder (with its own
 *   "Bookmarks bar" sub-folder) and writes everything under it, leaving
 *   the existing bookmarks bar and "Other bookmarks" untouched.
 * - `'restore-merge'`: writes directly into the existing bookmarks bar and
 *   "Other bookmarks" roots, merging with what's already there.
 * - `'restore-replace'`: destructive — first removes every existing child
 *   of the bookmarks bar and "Other bookmarks" roots, then writes the
 *   parsed tree into them. Existing bookmarks not present in `html` are
 *   permanently lost.
 *
 * Errors thrown by the parse step are re-wrapped as a load error. Errors
 * from the create step are re-wrapped as a create error, unless they
 * already carry the `PROCESS_ERROR` prefix (see `processBookmarks`), in
 * which case they're rethrown as-is so the caller can distinguish a
 * structural failure (e.g. the browser's roots not being present) from an
 * arbitrary `browser.bookmarks.create()` failure.
 */
export async function importFromHTML(
  html: string,
  mode: ImportMode = 'folder',
): Promise<void> {
  let parsed: ParsedBookmark[]

  try {
    parsed = parseHTML(html)
  } catch (error) {
    throw new Error(
      i18n.t('importFromHTMLLoadError', [(error as Error).message]),
    )
  }

  try {
    await processBookmarks(parsed, mode)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw error
    }
    throw new Error(
      i18n.t('importFromHTMLCreateError', [(error as Error).message]),
    )
  }
}

/**
 * Parses a Netscape-format bookmarks HTML document into a `ParsedBookmark`
 * tree, using the standard `<DL>`/`<DT>`/`<H3>`/`<A>` structure.
 *
 * Uses `DOMParser`, which is not available in a service worker (e.g. an
 * MV3 background script) — this function must be called from a context
 * that has a `DOMParser` implementation, such as a page or offscreen
 * document.
 *
 * The `<H3 personal_toolbar_folder="true">` attribute is how Netscape-format
 * exports mark the bookmarks bar folder; that folder is mapped to
 * `isBookmarksBar: true` and always placed first in the returned array via
 * `unshift`, regardless of its position in the source document. Every
 * other top-level bookmark or folder is nested under a synthetic "Other
 * bookmarks" node.
 */
export function parseHTML(html: string): ParsedBookmark[] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const result: ParsedBookmark[] = []
  const otherBookmarks: ParsedBookmark[] = []

  const toolbarH3 = document.querySelector('h3[personal_toolbar_folder="true"]')
  const outerDl =
    document.querySelector('body > dl') ?? document.querySelector('dl')
  if (!outerDl) return result

  const workingDl = toolbarH3?.closest('dl') ?? outerDl

  const topLevelDts = workingDl.querySelectorAll(':scope > dt')

  topLevelDts.forEach((dt) => {
    const firstChild = dt.firstElementChild
    if (!firstChild) return

    if (firstChild.tagName === 'A') {
      otherBookmarks.push(parseBookmarkElement(firstChild as HTMLAnchorElement))
    } else if (firstChild.tagName === 'H3') {
      const h3 = firstChild as HTMLElement
      const isBookmarksBar =
        h3.hasAttribute('personal_toolbar_folder') &&
        h3.getAttribute('personal_toolbar_folder') === 'true'

      const folder = parseFolderElement(h3, dt)

      if (isBookmarksBar) {
        folder.isBookmarksBar = true
        result.unshift(folder)
      } else {
        otherBookmarks.push(folder)
      }
    }
  })

  if (otherBookmarks.length > 0) {
    result.push({
      isOtherBookmarks: true,
      title: i18n.t('otherBookmarks'),
      dateAdded: Date.now(),
      children: otherBookmarks,
    })
  }

  return result
}

/**
 * Parses a single `<A>` element into a bookmark. The `add_date` attribute
 * is a Unix timestamp in seconds (the Netscape export format), so it's
 * multiplied by 1000 to match the millisecond timestamps `Date.now()` and
 * the rest of this codebase use. Falls back to the current time when
 * `add_date` is absent.
 */
function parseBookmarkElement(a: HTMLAnchorElement): ParsedBookmark {
  const dateAddedAttribute = a.getAttribute('add_date')
  return {
    title: a.textContent?.trim() ?? '',
    url: a.getAttribute('href') ?? undefined,
    dateAdded: dateAddedAttribute
      ? parseInt(dateAddedAttribute) * 1000
      : Date.now(),
  }
}

/**
 * Parses an `<H3>` folder heading and its sibling/nested `<DL>` into a
 * folder node, recursing into nested bookmarks and folders. Like
 * `parseBookmarkElement`, `add_date` and `last_modified` are Unix
 * timestamps in seconds and are converted to milliseconds.
 */
function parseFolderElement(h3: HTMLElement, dt: Element): ParsedBookmark {
  const dateAddedAttribute = h3.getAttribute('add_date')
  const lastModifiedAttribute = h3.getAttribute('last_modified')

  const folder: ParsedBookmark = {
    title: h3.textContent?.trim() ?? '',
    dateAdded: dateAddedAttribute
      ? parseInt(dateAddedAttribute) * 1000
      : Date.now(),
    dateGroupModified: lastModifiedAttribute
      ? parseInt(lastModifiedAttribute) * 1000
      : Date.now(),
    children: [],
  }

  const childDl =
    (dt.querySelector(':scope > dl') as Element | null) ??
    (dt.nextElementSibling?.tagName === 'DL' ? dt.nextElementSibling : null)

  if (childDl) {
    const childDts = childDl.querySelectorAll(':scope > dt')
    childDts.forEach((childDt) => {
      const firstChild = childDt.firstElementChild
      if (!firstChild) return

      if (firstChild.tagName === 'A') {
        folder.children!.push(
          parseBookmarkElement(firstChild as HTMLAnchorElement),
        )
      } else if (firstChild.tagName === 'H3') {
        folder.children!.push(
          parseFolderElement(firstChild as HTMLElement, childDt),
        )
      }
    })
  }

  return folder
}

/**
 * Writes the parsed tree into the browser according to `mode` (see
 * `importFromHTML` for what each mode does).
 *
 * Errors thrown here are prefixed with `'PROCESS_ERROR:'` to signal to
 * `importFromHTML` that they represent a structural failure (missing
 * bookmarks bar / "Other bookmarks" roots) rather than an arbitrary
 * `browser.bookmarks` API failure, so the caller can rethrow them as-is
 * instead of wrapping them in a generic create-error message.
 */
async function processBookmarks(
  parsed: ParsedBookmark[],
  mode: ImportMode,
): Promise<void> {
  const tree = await browser.bookmarks.getTree()
  const root = tree[0]

  if (!root?.children?.[0] || !root.children?.[1]) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromHTMLProcessError'))
  }

  if (mode === 'folder') {
    const importedFolder = await createItem({
      title: i18n.t('importedBookmarks'),
    })

    const importedBookmarksBar = await createItem({
      parentId: importedFolder.id,
      title: i18n.t('bookmarksBar'),
    })

    for (const bookmark of parsed) {
      if (bookmark.isBookmarksBar) {
        await createBookmarks(bookmark.children ?? [], importedBookmarksBar.id)
      } else if (bookmark.isOtherBookmarks) {
        await createBookmarks(bookmark.children ?? [], importedFolder.id)
      }
    }
  } else {
    const bookmarksBarNode = root.children.at(0)
    const otherBookmarksNode = root.children.at(1)
    const bookmarksBarId = bookmarksBarNode?.id
    const otherBookmarksId = otherBookmarksNode?.id

    if (!bookmarksBarId || !otherBookmarksId) {
      throw new Error('PROCESS_ERROR:' + i18n.t('importFromHTMLProcessError'))
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
      if (bookmark.isBookmarksBar) {
        await createBookmarks(bookmark.children ?? [], bookmarksBarId)
      } else if (bookmark.isOtherBookmarks) {
        await createBookmarks(bookmark.children ?? [], otherBookmarksId)
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
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails,
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details)
}
