interface DuplicateSourceNode {
  id: string
  title: string
  url?: string
  dateAdded?: number
  children?: DuplicateSourceNode[]
}

/**
 * One bookmark that belongs to a {@link DuplicateGroup}.
 */
interface DuplicateCopy {
  id: string
  title: string
  url: string
  folderPath: string[]
  dateAdded: number | undefined
}

/**
 * Two or more bookmarks sharing the same normalized URL; `copies` is ordered
 * oldest first (copies without a date sort last).
 */
export interface DuplicateGroup {
  normalizedUrl: string
  copies: [DuplicateCopy, DuplicateCopy, ...DuplicateCopy[]]
}

/**
 * Normalizes a URL for Duplicate comparison: scheme and host lowercased,
 * `http` treated as `https`, a leading `www.`, a trailing slash and any
 * `#fragment` ignored. The query string is preserved. An unparseable URL falls
 * back to its trimmed, lowercased text so the result is stable.
 * @param url The raw bookmark URL.
 * @returns The normalized URL used as the comparison key.
 */
export function normalizeUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return url.trim().toLowerCase()
  }
  const scheme = parsed.protocol === 'http:' ? 'https:' : parsed.protocol
  const host = parsed.host.replace(/^www\./, '')
  const path = parsed.pathname.replace(/\/+$/, '')
  return `${scheme}//${host}${path}${parsed.search}`
}

function collectCopies(
  nodes: DuplicateSourceNode[],
  folderPath: string[],
  into: DuplicateCopy[],
): void {
  for (const node of nodes) {
    if (node.url !== undefined) {
      into.push({
        id: node.id,
        title: node.title,
        url: node.url,
        folderPath,
        dateAdded: node.dateAdded,
      })
    } else if (node.children) {
      const nextPath = node.title ? [...folderPath, node.title] : folderPath
      collectCopies(node.children, nextPath, into)
    }
  }
}

function compareOldestFirst(a: DuplicateCopy, b: DuplicateCopy): number {
  return a.dateAdded === b.dateAdded
    ? 0
    : (a.dateAdded ?? Infinity) - (b.dateAdded ?? Infinity)
}

/**
 * Finds Duplicate groups in a bookmark tree: bookmarks whose normalized URL
 * matches. Folders are never compared. Groups appear in the order their first
 * copy is met in the tree.
 * @param nodes The tree nodes to walk recursively.
 * @returns Groups of 2+ copies, each sorted oldest first.
 */
export function findDuplicateGroups(
  nodes: DuplicateSourceNode[],
): DuplicateGroup[] {
  const copies: DuplicateCopy[] = []
  collectCopies(nodes, [], copies)
  const byUrl = new Map<string, DuplicateCopy[]>()
  for (const copy of copies) {
    const key = normalizeUrl(copy.url)
    const bucket = byUrl.get(key)
    byUrl.set(key, bucket ? [...bucket, copy] : [copy])
  }
  const groups: DuplicateGroup[] = []
  for (const [normalizedUrl, bucket] of byUrl) {
    const [first, second, ...rest] = bucket.toSorted(compareOldestFirst)
    if (first && second) {
      groups.push({ normalizedUrl, copies: [first, second, ...rest] })
    }
  }
  return groups
}
