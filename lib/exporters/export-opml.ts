import {
  buildExportTree,
  escapeXml,
  type ExportNode,
  type TreeExportOptions,
} from './export-tree'

/**
 * Exports bookmarks as an OPML 2.0 document: folders are nested `<outline>`
 * elements and bookmarks are `type="link"` outlines carrying `text`, `title`
 * and `url`. Dates are not written.
 * @param options Which bookmarks to export and which folders to hide.
 * @returns The OPML XML text.
 */
export async function exportToOPML(
  options: TreeExportOptions,
): Promise<string> {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>Bookmarks</title>',
    '  </head>',
    '  <body>',
  ]
  renderNodes(await buildExportTree(options), 2, lines)
  lines.push('  </body>', '</opml>')
  return `${lines.join('\n')}\n`
}

/**
 * Appends one `<outline>` per node onto `lines`, recursing into folders.
 * @param nodes The nodes to render.
 * @param depth The current indent depth, in two-space steps.
 * @param lines The accumulator lines are pushed onto.
 */
function renderNodes(
  nodes: ExportNode[],
  depth: number,
  lines: string[],
): void {
  const indent = '  '.repeat(depth)
  for (const node of nodes) {
    const title = escapeAttribute(node.title)
    if (node.kind === 'bookmark') {
      lines.push(
        `${indent}<outline type="link" text="${title}" title="${title}" url="${escapeAttribute(node.url)}"/>`,
      )
    } else if (node.children.length === 0) {
      lines.push(`${indent}<outline text="${title}" title="${title}"/>`)
    } else {
      lines.push(`${indent}<outline text="${title}" title="${title}">`)
      renderNodes(node.children, depth + 1, lines)
      lines.push(`${indent}</outline>`)
    }
  }
}

/**
 * Escapes text for an XML attribute value. Raw newlines and tabs are encoded
 * as character references because XML attribute-value normalization would
 * otherwise turn them into spaces.
 * @param text The raw attribute text.
 * @returns The escaped attribute text.
 */
function escapeAttribute(text: string): string {
  return escapeXml(text).replaceAll('\n', '&#10;').replaceAll('\t', '&#9;')
}
