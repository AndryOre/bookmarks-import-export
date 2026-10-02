/**
 * Formats a Safety snapshot timestamp for display in the user's locale, with
 * a medium date and a short time.
 * @param takenAt Epoch milliseconds the snapshot was taken.
 * @returns The localized date and time string.
 */
export function formatSnapshotDate(takenAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(takenAt))
}
