import { getFaviconBase64 } from '@/lib/favicon';
import type { ExtendedBookmarkTreeNode } from '@/lib/types';

interface ExportHTMLOptions {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null;
  includeIconData: boolean;
  includeDateAdded: boolean;
  includeDateLastUsed: boolean;
  includeDateGroupModified: boolean;
  hideOtherBookmarks: boolean;
  hideParentFolder: boolean;
}

export async function exportToHTML(options: ExportHTMLOptions): Promise<string> {
  const {
    selectedBookmarks,
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  } = options;

  const rootNodes = await browser.bookmarks.getTree();
  const rootNode = rootNodes[0];
  const nodesToExport = selectedBookmarks ?? rootNode.children ?? [];

  const lines: string[] = [];

  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  lines.push('<!-- This is an automatically generated file.');
  lines.push('     It will be read and overwritten.');
  lines.push('     DO NOT EDIT! -->');
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push('<TITLE>Bookmarks</TITLE>');
  lines.push('<H1>Bookmarks</H1>');
  lines.push('<DL><p>');

  await generateHtmlContent(lines, nodesToExport, 1, {
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  });

  lines.push('</DL><p>');

  return lines.join('\n');
}

// ── Generación recursiva ──────────────────────────────────────────────────────

async function generateHtmlContent(
  lines: string[],
  nodes: ExtendedBookmarkTreeNode[],
  level: number,
  opts: Omit<ExportHTMLOptions, 'selectedBookmarks'>
): Promise<void> {
  const indent = '    '.repeat(level);

  for (const node of nodes) {
    if (node.url) {
      await appendBookmarkLine(lines, node, indent, opts);
    } else if (node.children) {
      if (node.id === '2' && opts.hideOtherBookmarks) {
        // id="2" (Other Bookmarks) con hideOtherBookmarks: aplana sin emitir <H3>
        await generateHtmlContent(lines, node.children, level, opts);
      } else if (
        opts.hideParentFolder &&
        node.id !== '0' &&
        node.id !== '1' &&
        node.id !== '2'
      ) {
        // Carpetas normales con hideParentFolder: aplana sin emitir <H3>
        // Los ids especiales (0, 1, 2) se emiten siempre con su encabezado
        await generateHtmlContent(lines, node.children, level, opts);
      } else {
        await appendFolderLines(lines, node, level, indent, opts);
      }
    }
  }
}

async function appendBookmarkLine(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  indent: string,
  opts: Pick<ExportHTMLOptions, 'includeIconData' | 'includeDateAdded' | 'includeDateLastUsed'>
): Promise<void> {
  let attrs = `HREF="${escapeUrl(node.url!)}"`;

  if (opts.includeDateAdded && node.dateAdded) {
    attrs += ` ADD_DATE="${Math.floor(node.dateAdded / 1000)}"`;
  }

  if (opts.includeDateLastUsed && node.dateLastUsed) {
    attrs += ` LAST_USED="${Math.floor(node.dateLastUsed / 1000)}"`;
  }

  if (opts.includeIconData) {
    const iconData = await getFaviconBase64(node.url!);
    if (iconData) {
      attrs += ` ICON="${iconData}"`;
    }
  }

  const title = escapeTitle(node.title);
  lines.push(`${indent}<DT><A ${attrs}>${title}</A>`);
}

async function appendFolderLines(
  lines: string[],
  node: ExtendedBookmarkTreeNode,
  level: number,
  indent: string,
  opts: Omit<ExportHTMLOptions, 'selectedBookmarks'>
): Promise<void> {
  let attrs = '';

  if (opts.includeDateAdded && node.dateAdded) {
    attrs += ` ADD_DATE="${Math.floor(node.dateAdded / 1000)}"`;
  }

  if (opts.includeDateGroupModified && node.dateGroupModified) {
    attrs += ` LAST_MODIFIED="${Math.floor(node.dateGroupModified / 1000)}"`;
  }

  if (node.id === '1') {
    attrs += ' PERSONAL_TOOLBAR_FOLDER="true"';
  }

  const title = escapeTitle(node.title);
  lines.push(`${indent}<DT><H3${attrs}>${title}</H3>`);
  lines.push(`${indent}<DL><p>`);

  if (node.children) {
    await generateHtmlContent(lines, node.children as ExtendedBookmarkTreeNode[], level + 1, opts);
  }

  lines.push(`${indent}</DL><p>`);
}

// ── Escape helpers ────────────────────────────────────────────────────────────

function escapeTitle(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** URLs no escapan & — solo < > " ' para no romper el atributo HTML. */
function escapeUrl(url: string): string {
  return url
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
