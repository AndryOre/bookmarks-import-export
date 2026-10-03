import { normalizeUrl } from './duplicates'
import { isAllowedBookmarkUrl } from './importers/url-validation'
import type { ImportMode, ParsedBookmark } from './types'

interface ExistingNode {
  id?: string
  title?: string
  url?: string
  children?: ExistingNode[]
}

/**
 * Collects the normalized URL of every bookmark in a live bookmarks tree,
 * folders at any depth included.
 * @param nodes The tree nodes to walk, e.g. `browser.bookmarks.getTree()`.
 * @returns The set of normalized URLs already present.
 */
export function collectExistingUrls(nodes: ExistingNode[]): Set<string> {
  const urls = new Set<string>()
  const visit = (level: ExistingNode[]): void => {
    for (const node of level) {
      if (node.url !== undefined) urls.add(normalizeUrl(node.url))
      if (node.children) visit(node.children)
    }
  }
  visit(nodes)
  return urls
}

/**
 * Removes from a parsed import tree every bookmark that is a Duplicate: its
 * normalized URL is in `existingUrls`, or an earlier bookmark of the same tree
 * already has it (the first occurrence is kept). Folders are always kept, and
 * nodes without an allowed URL are left for the importer to count as invalid.
 * Neither the input tree nor `existingUrls` is mutated.
 * @param nodes The parsed import tree.
 * @param existingUrls Normalized URLs already in the browser.
 * @returns The filtered tree and how many bookmarks were dropped.
 */
export function dropDuplicateBookmarks(
  nodes: ParsedBookmark[],
  existingUrls: ReadonlySet<string>,
): { nodes: ParsedBookmark[]; skippedDuplicates: number } {
  const seen = new Set(existingUrls)
  let skippedDuplicates = 0

  const filter = (level: ParsedBookmark[]): ParsedBookmark[] => {
    const kept: ParsedBookmark[] = []
    for (const node of level) {
      if (isAllowedBookmarkUrl(node.url)) {
        const key = normalizeUrl(node.url)
        if (seen.has(key)) {
          skippedDuplicates++
          continue
        }
        seen.add(key)
        kept.push(node)
      } else if (node.children) {
        kept.push({ ...node, children: filter(node.children) })
      } else {
        kept.push(node)
      }
    }
    return kept
  }

  return { nodes: filter(nodes), skippedDuplicates }
}

/**
 * Applies the Skip duplicates option to a parsed import tree. Restore-replace
 * never skips, because its target is cleared first so nothing can collide.
 * @param parsed The parsed import tree.
 * @param liveTree The browser's current bookmarks tree.
 * @param mode The import mode.
 * @param isEnabled Whether Skip duplicates is on.
 * @returns The tree to write and how many bookmarks were dropped.
 */
export function applySkipDuplicates(
  parsed: ParsedBookmark[],
  liveTree: ExistingNode[],
  mode: ImportMode,
  isEnabled: boolean,
): { nodes: ParsedBookmark[]; skippedDuplicates: number } {
  return !isEnabled || mode === 'restore-replace'
    ? { nodes: parsed, skippedDuplicates: 0 }
    : dropDuplicateBookmarks(parsed, collectExistingUrls(liveTree))
}
