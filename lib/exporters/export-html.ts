import { countBookmarks } from '@/lib/count-bookmarks'
import {
  createExportTicker,
  type ExportControl,
  type ExportTicker,
} from '@/lib/export-control'
import { getFaviconBase64 } from '@/lib/favicon'
import type { ExtendedBookmarkTreeNode } from '@/lib/types'

import { isBookmarksBar, isOtherBookmarks } from './root-folders'

type HtmlNodeOptions = Omit<
  ExportHTMLOptions,
  'selectedBookmarks' | keyof ExportControl
> & { ticker: ExportTicker }

interface ExportHTMLOptions extends ExportControl {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null
  includeIconData: boolean
  includeDateAdded: boolean
  includeDateLastUsed: boolean
  includeDateGroupModified: boolean
  hideOtherBookmarks: boolean
  hideParentFolder: boolean
}

/**
 * Exports bookmarks as a Netscape-format bookmarks file (the `<!DOCTYPE
 * NETSCAPE-Bookmark-file-1>` HTML dialect used by every major browser's
 * import/export). Timestamps are converted from the milliseconds Chrome
 * stores to whole seconds for the `ADD_DATE`/`LAST_MODIFIED`/`LAST_USED`
 * attributes.
 * @param options Which bookmarks to export and which optional attributes to include.
 * @returns The Netscape-format bookmarks HTML text.
 */
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

  const ticker = createExportTicker(
    options,
    countBookmarks(nodesToExport as ExtendedBookmarkTreeNode[]),
  )
  await generateHtmlContent(
    lines,
    nodesToExport as ExtendedBookmarkTreeNode[],
    1,
    {
      ticker,
      includeIconData,
      includeDateAdded,
      includeDateLastUsed,
      includeDateGroupModified,
      hideOtherBookmarks,
      hideParentFolder,
    },
  )

  ticker.finish()
  lines.push('</DL><p>')

  return lines.join('\n')
}

/**
 * Recursively appends one `<DT>` line per bookmark and one folder block (with
 * its own nested `<DL>`) per folder onto `lines`. The bookmarks bar and other
 * bookmarks folders are never hidden by `hideParentFolder`; "other bookmarks"
 * can independently be flattened away via `hideOtherBookmarks`.
 * @param lines The accumulator lines are pushed onto.
 * @param nodes The nodes to walk.
 * @param level The current indent level.
 * @param options Which optional attributes and folder-hiding behavior to apply.
 * @returns Resolves once every node has been appended.
 */
async function generateHtmlContent(
  lines: string[],
  nodes: ExtendedBookmarkTreeNode[],
  level: number,
  options: HtmlNodeOptions,
): Promise<void> {
  const indent = ' '.repeat(4).repeat(level)

  for (const node of nodes) {
    if (node.url) {
      await appendBookmarkLine(lines, node, indent, options)
    } else if (node.children) {
      const isOtherBookmarksHidden =
        isOtherBookmarks(node) && options.hideOtherBookmarks
      const isParentFolderHidden =
        options.hideParentFolder &&
        node.id !== '0' &&
        !isBookmarksBar(node) &&
        !isOtherBookmarks(node)

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

/**
 * Appends a single `<DT><A ...>` line for `node` onto `lines`.
 * @param lines The accumulator lines are pushed onto.
 * @param node The bookmark node to append.
 * @param indent The leading whitespace for this line.
 * @param options Which optional attributes to include.
 * @returns Resolves once the line has been appended.
 */
async function appendBookmarkLine(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  indent: string,
  options: Pick<
    ExportHTMLOptions,
    'includeIconData' | 'includeDateAdded' | 'includeDateLastUsed'
  > & { ticker: ExportTicker },
): Promise<void> {
  options.ticker.tick()
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

/**
 * Appends a folder's opening `<DT><H3>`/`<DL><p>` lines, recurses into its
 * children at the next indent level, then appends the closing `</DL><p>`.
 * @param lines The accumulator lines are pushed onto.
 * @param node The folder node to append.
 * @param level The current indent level.
 * @param indent The leading whitespace for this folder's own lines.
 * @param options Which optional attributes and folder-hiding behavior to apply.
 * @returns Resolves once the folder and its children have been appended.
 */
async function appendFolderLines(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  level: number,
  indent: string,
  options: HtmlNodeOptions,
): Promise<void> {
  let attributes = ''

  if (options.includeDateAdded && node.dateAdded) {
    attributes += ` ADD_DATE="${Math.floor(node.dateAdded / 1000)}"`
  }

  if (options.includeDateGroupModified && node.dateGroupModified) {
    attributes += ` LAST_MODIFIED="${Math.floor(node.dateGroupModified / 1000)}"`
  }

  if (isBookmarksBar(node)) {
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

/**
 * Escapes text for use inside an `<A>`/`<H3>` element's content. Unlike
 * {@link escapeUrl}, this also escapes `&`, since bookmark titles are free
 * text that commonly contains literal ampersands.
 * @param string_ The title text to escape.
 * @returns The escaped title text.
 */
function escapeTitle(string_: string): string {
  return string_
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Escapes a URL for use in the `HREF` attribute. Like {@link escapeTitle},
 * this escapes `&` first: HTML parsers decode character references inside
 * attribute values, so a raw `?a=1&copy` would be read back as `?a=1©`.
 * @param url The URL to escape.
 * @returns The escaped URL.
 */
function escapeUrl(url: string): string {
  return url
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
