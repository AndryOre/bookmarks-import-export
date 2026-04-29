const PLACEHOLDERS: [RegExp, (d: Date) => string][] = [
  [/%yyyy/gi, (d) => String(d.getFullYear())],
  [/%yy/gi, (d) => String(d.getFullYear()).slice(-2)],
  [/%mm/gi, (d) => String(d.getMonth() + 1).padStart(2, '0')],
  [/%dd/gi, (d) => String(d.getDate()).padStart(2, '0')],
  [/%hh/gi, (d) => String(d.getHours()).padStart(2, '0')],
  [/%min/gi, (d) => String(d.getMinutes()).padStart(2, '0')],
  [/%sec/gi, (d) => String(d.getSeconds()).padStart(2, '0')],
];

export function formatFilenameTemplate(template: string, date = new Date()): string {
  // Longest tokens first (already ordered above: %yyyy before %yy, %min/%sec before single-char)
  let result = template;
  for (const [pattern, resolver] of PLACEHOLDERS) {
    result = result.replace(pattern, resolver(date));
  }

  // Sanitize for all major filesystems
  result = result.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();

  return result || 'Bookmarks';
}
