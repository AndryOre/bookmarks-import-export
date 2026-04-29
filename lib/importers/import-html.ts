import { i18n } from '#i18n';
import type { Browser } from '@wxt-dev/browser';
import type { ParsedBookmark } from '@/lib/types';

export async function importFromHTML(html: string): Promise<void> {
  let parsed: ParsedBookmark[];

  try {
    parsed = parseHTML(html);
  } catch (error) {
    throw new Error(i18n.t('importFromHTMLLoadError', [(error as Error).message]));
  }

  try {
    await processBookmarks(parsed);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PROCESS_ERROR')) {
      throw error;
    }
    throw new Error(i18n.t('importFromHTMLCreateError', [(error as Error).message]));
  }
}

// ── Fase 1: Parseo DOM ────────────────────────────────────────────────────────

function parseHTML(html: string): ParsedBookmark[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const result: ParsedBookmark[] = [];
  const otherBookmarks: ParsedBookmark[] = [];

  const topLevelDts = doc.querySelectorAll('body > dl > dt');

  topLevelDts.forEach((dt) => {
    const firstChild = dt.firstElementChild;
    if (!firstChild) return;

    if (firstChild.tagName === 'A') {
      otherBookmarks.push(parseBookmarkElement(firstChild as HTMLAnchorElement));
    } else if (firstChild.tagName === 'H3') {
      const h3 = firstChild as HTMLElement;
      const isBookmarksBar =
        h3.hasAttribute('personal_toolbar_folder') &&
        h3.getAttribute('personal_toolbar_folder') === 'true';

      const folder = parseFolderElement(h3, dt);

      if (isBookmarksBar) {
        folder.isBookmarksBar = true;
        result.unshift(folder);
      } else {
        otherBookmarks.push(folder);
      }
    }
  });

  if (otherBookmarks.length > 0) {
    result.push({
      isOtherBookmarks: true,
      title: i18n.t('otherBookmarks'),
      dateAdded: Date.now(),
      children: otherBookmarks,
    });
  }

  return result;
}

function parseBookmarkElement(a: HTMLAnchorElement): ParsedBookmark {
  const addDateAttr = a.getAttribute('add_date');
  return {
    title: a.textContent?.trim() ?? '',
    url: a.getAttribute('href') ?? undefined,
    dateAdded: addDateAttr ? parseInt(addDateAttr) * 1000 : Date.now(),
  };
}

function parseFolderElement(h3: HTMLElement, dt: Element): ParsedBookmark {
  const addDateAttr = h3.getAttribute('add_date');
  const lastModifiedAttr = h3.getAttribute('last_modified');

  const folder: ParsedBookmark = {
    title: h3.textContent?.trim() ?? '',
    dateAdded: addDateAttr ? parseInt(addDateAttr) * 1000 : Date.now(),
    dateGroupModified: lastModifiedAttr ? parseInt(lastModifiedAttr) * 1000 : Date.now(),
    children: [],
  };

  const nextDl = dt.nextElementSibling;
  if (nextDl && nextDl.tagName === 'DL') {
    const childDts = nextDl.querySelectorAll(':scope > dt');
    childDts.forEach((childDt) => {
      const firstChild = childDt.firstElementChild;
      if (!firstChild) return;

      if (firstChild.tagName === 'A') {
        folder.children!.push(parseBookmarkElement(firstChild as HTMLAnchorElement));
      } else if (firstChild.tagName === 'H3') {
        folder.children!.push(parseFolderElement(firstChild as HTMLElement, childDt));
      }
    });
  }

  return folder;
}

// ── Fase 2: Creación en Chrome ────────────────────────────────────────────────

async function processBookmarks(parsed: ParsedBookmark[]): Promise<void> {
  const tree = await browser.bookmarks.getTree();
  const root = tree[0];

  if (!root.children?.[0] || !root.children?.[1]) {
    throw new Error('PROCESS_ERROR:' + i18n.t('importFromHTMLProcessError'));
  }

  const importedFolder = await createItem({ title: i18n.t('importedBookmarks') });

  const importedBookmarksBar = await createItem({
    parentId: importedFolder.id,
    title: i18n.t('bookmarksBar'),
  });

  for (const bookmark of parsed) {
    if (bookmark.isBookmarksBar) {
      await createBookmarks(bookmark.children ?? [], importedBookmarksBar.id);
    } else if (bookmark.isOtherBookmarks) {
      await createBookmarks(bookmark.children ?? [], importedFolder.id);
    }
  }
}

async function createBookmarks(nodes: ParsedBookmark[], parentId: string): Promise<void> {
  for (const node of nodes) {
    if (node.url) {
      await createItem({ parentId, title: node.title, url: node.url });
    } else if (node.children && node.children.length > 0) {
      const folder = await createItem({ parentId, title: node.title });
      await createBookmarks(node.children, folder.id);
    }
  }
}

function createItem(
  details: Browser.bookmarks.CreateDetails
): Promise<Browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.create(details);
}
