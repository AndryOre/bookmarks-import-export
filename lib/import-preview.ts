import Papa from 'papaparse';
import { detectFormat } from './detect-format';
import { parseHTML } from './importers/import-html';
import { preprocessBookmarks } from './importers/import-json';
import type { ImportPreview, ParsedBookmark } from './types';

function countBookmarks(nodes: ParsedBookmark[]): number {
  return nodes.reduce((acc, node) => {
    if (node.url) return acc + 1;
    if (node.children) return acc + countBookmarks(node.children);
    return acc;
  }, 0);
}

export function getImportPreview(text: string, mimeType: string): ImportPreview {
  const format = detectFormat(text, mimeType);

  try {
    if (format === 'html') {
      const parsed = parseHTML(text);
      const barNode = parsed.find((n) => n.isBookmarksBar);
      const otherNode = parsed.find((n) => n.isOtherBookmarks);
      const bookmarksBarCount = countBookmarks(barNode?.children ?? []);
      const otherBookmarksCount = countBookmarks(otherNode?.children ?? []);
      return {
        format,
        bookmarksBarCount,
        otherBookmarksCount,
        totalCount: bookmarksBarCount + otherBookmarksCount,
        hasLocationData: !!(barNode || otherNode),
      };
    }

    if (format === 'json') {
      const raw = JSON.parse(text);
      const data: ParsedBookmark[] = Array.isArray(raw) ? raw : [raw];
      const preprocessed = preprocessBookmarks(data);
      const barNode = preprocessed.find((n) => n.isBookmarksBar);
      const otherNode = preprocessed.find((n) => n.isOtherBookmarks);
      const bookmarksBarCount = countBookmarks(barNode?.children ?? []);
      const otherBookmarksCount = countBookmarks(otherNode?.children ?? []);
      return {
        format,
        bookmarksBarCount,
        otherBookmarksCount,
        totalCount: bookmarksBarCount + otherBookmarksCount,
        hasLocationData: !!(barNode || otherNode),
      };
    }

    if (format === 'csv') {
      const parsed = Papa.parse<Record<string, string>>(text.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim(),
      });
      let count = 0;
      for (const row of parsed.data) {
        const title = row['title']?.trim();
        const url = row['url']?.trim();
        if (!title || !url) continue;
        try {
          new URL(url);
          count++;
        } catch {
          // invalid URL, skip
        }
      }
      return {
        format,
        bookmarksBarCount: 0,
        otherBookmarksCount: 0,
        totalCount: count,
        hasLocationData: false,
      };
    }
  } catch {
    // parse error — return minimal preview
  }

  return {
    format,
    bookmarksBarCount: 0,
    otherBookmarksCount: 0,
    totalCount: 0,
    hasLocationData: false,
  };
}
