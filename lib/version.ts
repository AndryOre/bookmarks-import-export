/**
 * Whether an update from `previousVersion` to `currentVersion` changed the
 * major or minor number (patch-only bumps and missing versions do not count).
 * @param previousVersion The version before the update, if known.
 * @param currentVersion The version after the update.
 * @returns Whether What's new should open.
 */
export function isMinorOrMajorUpdate(
  previousVersion: string | undefined,
  currentVersion: string,
): boolean {
  if (previousVersion === undefined) return false
  const previousParts = previousVersion.split('.', 2)
  const currentParts = currentVersion.split('.', 2)
  return (
    previousParts[0] !== currentParts[0] || previousParts[1] !== currentParts[1]
  )
}

/**
 * Whether the installed version has a changelog entry the user has not seen.
 * A never-recorded version counts as unseen; otherwise only a major or minor
 * difference does, since patch releases ship no changelog entry.
 * @param lastSeenVersion The last version whose changelog was seen, if any.
 * @param installedVersion The currently installed version.
 * @returns `true` while the "New" indicator should show.
 */
export function isWhatsNewUnseen(
  lastSeenVersion: string | null,
  installedVersion: string,
): boolean {
  return (
    lastSeenVersion === null ||
    isMinorOrMajorUpdate(lastSeenVersion, installedVersion)
  )
}

/**
 * Whether a changelog entry describes the installed release. Patch releases
 * ship no changelog entry, so only major and minor are compared.
 * @param entryVersion Version label of one changelog entry.
 * @param installedVersion Version in the extension manifest.
 * @returns `true` when the entry should be flagged "Current".
 */
export function isChangelogEntryCurrent(
  entryVersion: string,
  installedVersion: string,
): boolean {
  return !isMinorOrMajorUpdate(entryVersion, installedVersion)
}
