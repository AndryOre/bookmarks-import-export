interface DuplicateSourceNode {
  id: string
  title: string
  url?: string
  dateAdded?: number
  unmodifiable?: 'managed'
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
  unmodifiable: boolean
}

/**
 * Two or more bookmarks sharing the same normalized URL; `copies` is ordered
 * oldest first (copies without a date sort last).
 */
export interface DuplicateGroup {
  normalizedUrl: string
  copies: [DuplicateCopy, DuplicateCopy, ...DuplicateCopy[]]
}

const ROUTE_FRAGMENT = /^#[/!]/

function hasRouteFragment(parsed: URL): boolean {
  if (parsed.hash.length <= 1) return false
  const isDirectoryPath =
    parsed.search === '' &&
    parsed.pathname.length > 1 &&
    parsed.pathname.endsWith('/')
  return ROUTE_FRAGMENT.test(parsed.hash) || isDirectoryPath
}

/**
 * Normalizes a URL for Duplicate comparison: scheme and host lowercased,
 * `http` treated as `https`, a leading `www.` and a trailing slash ignored.
 * The query string is preserved. A `#fragment` is ignored only when it looks
 * like a plain anchor; a route-like fragment (`#/`, `#!`, or any fragment on a
 * directory-style path without a query, such as Gmail's `/mail/u/0/#inbox`) is kept. A
 * non-http(s) URL is returned trimmed and untouched, an unparseable one
 * trimmed and lowercased, so only exact matches group.
 * @param url The raw bookmark URL.
 * @returns The normalized URL used as the comparison key.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return trimmed.toLowerCase()
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return trimmed
  }
  const host = parsed.host.replace(/^www\./, '')
  const path = parsed.pathname.replace(/\/+$/, '')
  const hash = hasRouteFragment(parsed) ? parsed.hash : ''
  return `https://${host}${path}${parsed.search}${hash}`
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
        unmodifiable: node.unmodifiable !== undefined,
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
    if (bucket) bucket.push(copy)
    else byUrl.set(key, [copy])
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
