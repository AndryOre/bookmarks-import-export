import {
  buildExportTree,
  type ExportNode,
  type TreeExportOptions,
} from './export-tree'

/**
 * Exports bookmarks as a Markdown nested bullet list: every bookmark is a
 * `[title](url)` link and every folder a plain bullet whose children are
 * indented two spaces beneath it. Dates are not written.
 * @param options Which bookmarks to export and which folders to hide.
 * @returns The Markdown text, ending with a newline (empty for an empty tree).
 */
export async function exportToMarkdown(
  options: TreeExportOptions,
): Promise<string> {
  const lines: string[] = []
  renderNodes(await buildExportTree(options), 0, lines)
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`
}

/**
 * Appends one bullet per node onto `lines`, recursing into folders.
 * @param nodes The nodes to render.
 * @param depth The current nesting depth.
 * @param lines The accumulator lines are pushed onto.
 */
function renderNodes(
  nodes: ExportNode[],
  depth: number,
  lines: string[],
): void {
  const indent = '  '.repeat(depth)
  for (const node of nodes) {
    if (node.kind === 'bookmark') {
      const label = escapeText(node.title.trim() === '' ? node.url : node.title)
      lines.push(`${indent}- [${label}](${escapeDestination(node.url)})`)
    } else {
      lines.push(`${indent}- ${escapeText(node.title)}`)
      renderNodes(node.children, depth + 1, lines)
    }
  }
}

/**
 * Escapes Markdown punctuation in link text and folder names, and flattens
 * line breaks so a title stays on one bullet line.
 * @param text The raw title.
 * @returns The escaped text.
 */
function escapeText(text: string): string {
  return text
    .replaceAll(/\s*[\r\n]+\s*/g, ' ')
    .replaceAll(/[\\`*_[\]<>#|]/g, (character) => `\\${character}`)
    .replace(/^(\s*)([-+])(?=\s)/, String.raw`$1\$2`)
    .replace(/^(\s*\d+)([.)])(?=\s)/, String.raw`$1\$2`)
}

/**
 * Wraps a URL as an angle-bracket link destination when it holds spaces or
 * parentheses, and percent-encodes the characters that would break it.
 * @param url The raw URL.
 * @returns The link destination.
 */
function escapeDestination(url: string): string {
  const escaped = url
    .replaceAll(/[\r\n]+/g, '')
    .replaceAll('\\', '%5C')
    .replaceAll('<', '%3C')
    .replaceAll('>', '%3E')
  return /[\s()]/.test(escaped) ? `<${escaped}>` : escaped
}
