import { getFaviconBase64 } from '@/lib/favicon';
import type { ExtendedBookmarkTreeNode } from '@/lib/types';

interface ExportJSONOptions {
  selectedBookmarks: ExtendedBookmarkTreeNode[] | null;
  includeIconData: boolean;
  includeDateAdded: boolean;
  includeDateLastUsed: boolean;
  includeDateGroupModified: boolean;
  hideOtherBookmarks: boolean;
  hideParentFolder: boolean;
}

type NodeOpts = Omit<ExportJSONOptions, 'selectedBookmarks'>;

const toSeconds = (ms: number): number => Math.floor(ms / 1000);

export async function exportToJSON(
  options: ExportJSONOptions
): Promise<ExtendedBookmarkTreeNode[]> {
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
  const rootNode = rootNodes[0] as ExtendedBookmarkTreeNode;
  const nodesToExport = selectedBookmarks ?? rootNode.children ?? [];

  const opts: NodeOpts = {
    includeIconData,
    includeDateAdded,
    includeDateLastUsed,
    includeDateGroupModified,
    hideOtherBookmarks,
    hideParentFolder,
  };

  const processedChildren = await processNodes(nodesToExport as ExtendedBookmarkTreeNode[], opts);

  // Wrap en nodo raíz id="0" para compatibilidad bidireccional con el importador
  const root: ExtendedBookmarkTreeNode = { ...rootNode, children: processedChildren };
  delete root.url;
  delete root.parentId;
  delete root.index;
  delete root.dateLastUsed;
  delete root.iconData;
  if (root.dateAdded) root.dateAdded = toSeconds(root.dateAdded);
  if (!includeDateAdded) delete root.dateAdded;
  if (root.dateGroupModified) root.dateGroupModified = toSeconds(root.dateGroupModified);
  if (!includeDateGroupModified) delete root.dateGroupModified;

  return [root];
}

// ── Procesamiento recursivo ───────────────────────────────────────────────────

async function processNodes(
  nodes: ExtendedBookmarkTreeNode[],
  opts: NodeOpts
): Promise<ExtendedBookmarkTreeNode[]> {
  const result: ExtendedBookmarkTreeNode[] = [];
  for (const node of nodes) {
    const processed = await processNode(node, opts);
    result.push(...processed);
  }
  return result;
}

async function processNode(
  node: ExtendedBookmarkTreeNode,
  opts: NodeOpts
): Promise<ExtendedBookmarkTreeNode[]> {
  if (node.url) {
    const processed: ExtendedBookmarkTreeNode = { ...node };

    if (processed.dateAdded) processed.dateAdded = toSeconds(processed.dateAdded);
    if (!opts.includeDateAdded) delete processed.dateAdded;

    if (processed.dateLastUsed) processed.dateLastUsed = toSeconds(processed.dateLastUsed);
    if (!opts.includeDateLastUsed) delete processed.dateLastUsed;

    if (opts.includeIconData) {
      processed.iconData = await getFaviconBase64(node.url);
    }

    return [processed];
  } else if (node.children !== undefined) {
    // Aplanar "Other Bookmarks" (id="2") cuando hideOtherBookmarks está activo
    if (node.id === '2' && opts.hideOtherBookmarks) {
      return processNodes(node.children as ExtendedBookmarkTreeNode[], opts);
    }

    // Aplanar carpetas normales (no id 0/1/2) cuando hideParentFolder está activo
    if (opts.hideParentFolder && node.id !== '0' && node.id !== '1' && node.id !== '2') {
      return processNodes(node.children as ExtendedBookmarkTreeNode[], opts);
    }

    const processedChildren = await processNodes(node.children as ExtendedBookmarkTreeNode[], opts);

    const folder: ExtendedBookmarkTreeNode = { ...node, children: processedChildren };
    delete folder.url;
    delete folder.parentId;
    delete folder.index;
    delete folder.dateLastUsed;
    delete folder.iconData;

    if (folder.dateAdded) folder.dateAdded = toSeconds(folder.dateAdded);
    if (!opts.includeDateAdded) delete folder.dateAdded;

    if (folder.dateGroupModified) folder.dateGroupModified = toSeconds(folder.dateGroupModified);
    if (!opts.includeDateGroupModified) delete folder.dateGroupModified;

    return [folder];
  }

  return [];
}
