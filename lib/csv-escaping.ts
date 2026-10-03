const FORMULA_ESCAPE_PATTERN = /^'([=+\-@\t\r])/

/**
 * Escapes one folder name for the CSV `folder` column by prefixing every `\`
 * and `/` with a backslash, so `/` stays unambiguous as the path separator.
 * @param segment The raw folder title.
 * @returns The title safe to join with `/`.
 */
export function escapeFolderSegment(segment: string): string {
  return segment.replaceAll('\\', '\\\\').replaceAll('/', String.raw`\/`)
}

/**
 * Splits a CSV `folder` value on unescaped `/` and unescapes each segment
 * (`\/` becomes `/`, `\\` becomes `\`). A backslash before any other character
 * is kept literally, so older CSVs with unescaped paths still import. Empty
 * segments are dropped.
 * @param folderPath The `folder` column value.
 * @returns The folder titles from outermost to innermost.
 */
export function splitFolderPath(folderPath: string): string[] {
  const segments: string[] = []
  let current = ''
  for (let index = 0; index < folderPath.length; index++) {
    const char = folderPath.charAt(index)
    const next = folderPath.charAt(index + 1)
    if (char === '\\' && (next === '/' || next === '\\')) {
      current += next
      index++
    } else if (char === '/') {
      segments.push(current)
      current = ''
    } else {
      current += char
    }
  }
  segments.push(current)
  return segments.filter(Boolean)
}

/**
 * Removes the leading `'` that the CSV exporter adds before `=`, `+`, `-`,
 * `@`, tab or carriage return to neutralize spreadsheet formulas.
 * @param value A CSV field value.
 * @returns The value without the formula-escape prefix.
 */
export function unescapeFormulaField(value: string): string {
  return value.replace(FORMULA_ESCAPE_PATTERN, '$1')
}
