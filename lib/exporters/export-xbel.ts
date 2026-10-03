import {
  buildExportTree,
  escapeXml,
  type ExportNode,
  type TreeExportOptions,
} from './export-tree'

/**
 * Exports bookmarks as an XBEL 1.0 document: folders are `<folder>` elements
 * and bookmarks are `<bookmark href>` elements, each with a `<title>`. Dates
 * become ISO 8601 `added` (folders and bookmarks) and `visited` (bookmarks)
 * attributes when their options are enabled; the XBEL 1.0 DTD has no
 * folder-level `modified`.
 * @param options Which bookmarks to export, which dates to write and which folders to hide.
 * @returns The XBEL XML text.
 */
export async function exportToXBEL(
  options: TreeExportOptions,
): Promise<string> {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE xbel PUBLIC "+//IDN python.org//DTD XML Bookmark Exchange Language 1.0//EN//XML" "https://www.python.org/topics/xml/dtds/xbel-1.0.dtd">',
    '<xbel version="1.0">',
  ]
  renderNodes(await buildExportTree(options), 1, lines)
  lines.push('</xbel>')
  return `${lines.join('\n')}\n`
}

/**
 * Formats a millisecond timestamp as an XBEL attribute.
 * @param name The XBEL attribute name, such as `added`.
 * @param milliseconds The timestamp, or `undefined` to omit the attribute.
 * @returns The attribute with a leading space, or an empty string.
 */
function dateAttribute(name: string, milliseconds?: number): string {
  return milliseconds === undefined
    ? ''
    : ` ${name}="${new Date(milliseconds).toISOString()}"`
}

/**
 * Appends one `<folder>` or `<bookmark>` per node onto `lines`.
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
    const title = `<title>${escapeXml(node.title)}</title>`
    if (node.kind === 'bookmark') {
      const attributes =
        dateAttribute('added', node.dateAdded) +
        dateAttribute('visited', node.dateLastUsed)
      lines.push(
        `${indent}<bookmark href="${escapeXml(node.url)}"${attributes}>`,
        `${indent}  ${title}`,
        `${indent}</bookmark>`,
      )
    } else {
      const attributes = dateAttribute('added', node.dateAdded)
      lines.push(`${indent}<folder${attributes}>`, `${indent}  ${title}`)
      renderNodes(node.children, depth + 1, lines)
      lines.push(`${indent}</folder>`)
    }
  }
}
