import { ExportOptionsPanel } from '@/components/export-options-panel'

/**
 * The Export screen. The Export page ticket composes the final layout; until
 * then this only mounts the options panel in a stub area.
 * @returns The Export view.
 */
export function ExportRoute() {
  return <ExportOptionsPanel />
}
