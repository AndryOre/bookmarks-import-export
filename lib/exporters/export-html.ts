import { getFaviconBase64 } from '@/lib/favicon'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

interface ExportHTMLOptions {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeIconData: boolean
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
  hideOtherBookmarks: boolean
  hideParentFolder: boolean
}

export async function exportToHTML(
  options: ExportHTMLOptions,
): Promise<string> {
  const {
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  } = options

  const rootNodes = await browser.bookmarks.getTree()
  const rootNode = rootNodes[0]
  const nodesToExport = selectedBookmarks ?? rootNode?.children ?? []

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  await generateHtmlContent(
    lines,
    nodesToExport as ExtendedBookmarkTreeNode[],
    1,
    {
      includeIconData,
      includeDateAdded,
      includeDateLastUsed,
      includeDateGroupModified,
      hideOtherBookmarks,
      hideParentFolder,
    },
  )

  lines.push('</DL><p>')

  return lines.join('\n')
}

async function generateHtmlContent(
  lines: string[],
  nodes: ExtendedBookmarkTreeNode[],
  level: number,
  options: Omit<ExportHTMLOptions, 'selectedBookmarks'>,
): Promise<void> {
  const indent = ' '.repeat(4).repeat(level)

  for (const node of nodes) {
    if (node.url) {
      await appendBookmarkLine(lines, node, indent, options)
    } else if (node.children) {
      const isOtherBookmarksHidden =
        node.id === '2' && options.hideOtherBookmarks
      const isParentFolderHidden =
        options.hideParentFolder &&
        node.id !== '0' &&
        node.id !== '1' &&
        node.id !== '2'

      if (isOtherBookmarksHidden || isParentFolderHidden) {
        await generateHtmlContent(
          lines,
          node.children as ExtendedBookmarkTreeNode[],
          level,
          options,
        )
      } else {
        await appendFolderLines(lines, node, level, indent, options)
      }
    }
  }
}

async function appendBookmarkLine(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  indent: string,
  options: Pick<
    ExportHTMLOptions,
    'includeIconData' | 'includeDateAdded' | 'includeDateLastUsed'
  >,
): Promise<void> {
  let attributes = `HREF="${escapeUrl(node.url!)}"`

  if (options.includeDateAdded && node.dateAdded) {
    attributes += ` ADD_DATE="${Math.floor(node.dateAdded / 1000)}"`
  }

  if (options.includeDateLastUsed && node.dateLastUsed) {
    attributes += ` LAST_USED="${Math.floor(node.dateLastUsed / 1000)}"`
  }

  if (options.includeIconData) {
    const iconData = await getFaviconBase64(node.url!)
    if (iconData) {
      attributes += ` ICON="${iconData}"`
    }
  }

  const title = escapeTitle(node.title)
  lines.push(`${indent}<DT><A ${attributes}>${title}</A>`)
}

async function appendFolderLines(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  level: number,
  indent: string,
  options: Omit<ExportHTMLOptions, 'selectedBookmarks'>,
): Promise<void> {
  let attributes = ''

  if (options.includeDateAdded && node.dateAdded) {
    attributes += ` ADD_DATE="${Math.floor(node.dateAdded / 1000)}"`
  }

  if (options.includeDateGroupModified && node.dateGroupModified) {
    attributes += ` LAST_MODIFIED="${Math.floor(node.dateGroupModified / 1000)}"`
  }

  if (node.id === '1') {
    attributes += ' PERSONAL_TOOLBAR_FOLDER="true"'
  }

  const title = escapeTitle(node.title)
  lines.push(`${indent}<DT><H3${attributes}>${title}</H3>`, `${indent}<DL><p>`)

  if (node.children) {
    await generateHtmlContent(
      lines,
      node.children as ExtendedBookmarkTreeNode[],
      level + 1,
      options,
    )
  }

  lines.push(`${indent}</DL><p>`)
}

function escapeTitle(string_: string): string {
  return string_
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeUrl(url: string): string {
  return url
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
