import Papa from 'papaparse';
import type { BookmarkFormat } from '@/lib/types';

export function detectFormat(content: string, mimeType: string): BookmarkFormat {
  const type = mimeType.toLowerCase();

  switch (type) {
    case 'application/json':
      return isValidJSON(content) ? 'json' : 'unknown';
    case 'text/csv':
      return isValidCSV(content) ? 'csv' : 'unknown';
    case 'text/html':
      return isValidHTML(content) ? 'html' : 'unknown';
    default:
      return 'unknown';
  }
}

function isValidJSON(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function isValidHTML(content: string): boolean {
  return content.trim().startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
}

function isValidCSV(content: string): boolean {
  const result = Papa.parse(content.trim(), {
    header: true,
    skipEmptyLines: true,
    preview: 3,
  });

  if (result.errors.length > 0 || result.data.length === 0) return false;

  const fields = (result.meta.fields ?? []).map((f) => f.toLowerCase());
  const hasTitle = fields.some((f) => f.includes('title'));
  const hasUrl = fields.some((f) => f.includes('url'));

  return hasTitle && hasUrl;
}
