import { i18n } from '#i18n'
import type { Browser } from '@wxt-dev/browser'

import type { ImportMode, ParsedBookmark } from '@/lib/types'

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
