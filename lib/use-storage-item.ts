import type { WxtStorageItem } from '#imports'
import { useCallback, useEffect, useState } from 'react'

/**
 * Subscribes a component to a WXT storage item, mirroring it as React state.
 * `getValue()` is async, so the first render returns `item.fallback` and the
 * loaded value replaces it once the initial read resolves. If a later watch
 * callback fires with `null` (the item was removed), the value falls back to
 * `item.fallback` again rather than staying stale or turning into `null`.
 * @param item The WXT storage item to subscribe to.
 * @param initialValue Optional synchronous value for the first render (for
 * example from a cache), used instead of `item.fallback` until the real read
 * resolves.
 * @returns A `[value, setValue, isLoaded]` tuple (the setter is referentially
 * stable per item): `useState`'s shape plus a
 * flag that turns `true` once the initial read has resolved, so callers can
 * avoid acting on the fallback.
 */
export function useStorageItem<T>(
  item: WxtStorageItem<T, Record<string, unknown>>,
  initialValue?: T,
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(initialValue ?? item.fallback)
  const [isLoaded, setIsLoaded] = useState(false)
  const setItemValue = useCallback(
    (nextValue: T) => item.setValue(nextValue),
    [item],
  )

  useEffect(() => {
    const loadValue = async () => {
      setValue(await item.getValue())
      setIsLoaded(true)
    }
    void loadValue()

    const unwatch = item.watch((newValue) => {
      setValue(newValue ?? item.fallback)
    })
    return unwatch
  }, [item])

  return [value, setItemValue, isLoaded]
}
