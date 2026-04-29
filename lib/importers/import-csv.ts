import Papa from 'papaparse';
import { i18n } from '#i18n';
import type { Browser } from '@wxt-dev/browser';
import type { ParsedBookmark } from '@/lib/types';

export async function importFromCSV(csv: string): Promise<void> {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((e) => e.message).join('; '));
  }

  const tree = processCSVData(parsed.data);
  await createBookmarks(tree);
}

// ── Fase 1: Construir árbol desde filas planas ────────────────────────────────

function processCSVData(rows: Record<string, string>[]): ParsedBookmark[] {
  const root: ParsedBookmark[] = [];
  const folderMemo: Record<string, ParsedBookmark> = {};

  for (const row of rows) {
    const title = row['title']?.trim();
    const url = row['url']?.trim();

    if (!title || !url) continue;

    try {
      new URL(url);
    } catch {
      console.warn('[importFromCSV] Invalid URL, skipping row:', row);
      continue;
    }

    const folderPath = row['folder']?.trim() ?? '';
    const segments = folderPath.split('/').filter(Boolean);

    let currentLevel = root;
    let currentPath = '';

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!folderMemo[currentPath]) {
        const newFolder: ParsedBookmark = {
          title: segment,
          dateAdded: Date.now(),
          dateGroupModified: Date.now(),
          children: [],
        };
        currentLevel.push(newFolder);
        folderMemo[currentPath] = newFolder;
      }

      currentLevel = folderMemo[currentPath].children!;
    }

    currentLevel.push({ title, url, dateAdded: Date.now() });
  }

  return root;
}

// ── Fase 2: Crear en Chrome con deduplicación ─────────────────────────────────

async function createBookmarks(tree: ParsedBookmark[]): Promise<void> {
  const tree_chrome = await browser.bookmarks.getTree();
  const root = tree_chrome[0];

  if (!root.children?.[0] || !root.children?.[1]) {
    throw new Error(i18n.t('importFromCSVImportError' as any));
  }

  // BUG FIX #1: usar i18n en lugar de string hardcodeado en inglés
  // para que la deduplicación funcione en cualquier locale
  const importedFolderTitle = i18n.t('importedBookmarks');
  const existing = await browser.bookmarks.search({ title: importedFolderTitle });

  let importedFolderId: string;

  if (existing.length > 0) {
    importedFolderId = existing[0].id;
  } else {
    const created = await createItem({ title: importedFolderTitle });
    importedFolderId = created.id;
  }

  await createBookmarksRecursive(tree, importedFolderId);
}

async function createBookmarksRecursive(
  nodes: ParsedBookmark[],
  parentId: string
): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      // Bookmarks individuales: siempre se crean nuevos (sin deduplicación)
      await createItem({ parentId, title: node.title, url: node.url });
    } else if (node.children) {
      // Carpetas: deduplicar por título + parentId
      const existing = await browser.bookmarks.search({ title: node.title });
      const match = existing.find((r) => r.parentId === parentId && !r.url);

      const folderId = match
        ? match.id
        : (await createItem({ parentId, title: node.title })).id;

      await createBookmarksRecursive(node.children, folderId);
    }
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details);
}
