import type { WxtStorageItem } from '#imports'
import { useEffect, useState } from 'react'

/**
 * Subscribes a component to a WXT storage item, mirroring it as React state.
 * `getValue()` is async, so the first render returns `item.fallback` and the
 * loaded value replaces it once the initial read resolves. If a later watch
 * callback fires with `null` (the item was removed), the value falls back to
 * `item.fallback` again rather than staying stale or turning into `null`.
 */
export function useStorageItem<T>(
  item: WxtStorageItem<T, Record<string, unknown>>,
): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(item.fallback)

  useEffect(() => {
    const loadValue = async () => {
      setValue(await item.getValue())
    }
    void loadValue()

    const unwatch = item.watch((newValue) => {
      setValue(newValue ?? item.fallback)
    })
    return unwatch
  }, [item])

  return [value, item.setValue.bind(item)]
}
