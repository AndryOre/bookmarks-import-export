import type { WxtStorageItem } from '#imports'
import { useCallback, useEffect, useRef, useState } from 'react'

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
 * @returns A `[value, setValue, isLoaded, loadError]` tuple (the setter is
 * referentially stable per item). The setter updates local state
 * optimistically, reverting and rethrowing if the storage write fails.
 * `isLoaded` turns `true` once the initial read has settled, even when it
 * rejected, in which case `loadError` carries the failure.
 */
export function useStorageItem<T>(
  item: WxtStorageItem<T, Record<string, unknown>>,
  initialValue?: T,
): [T, (value: T) => Promise<void>, boolean, Error | undefined] {
  const [value, setValue] = useState<T>(initialValue ?? item.fallback)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | undefined>()
  const latestValue = useRef(value)

  const applyValue = useCallback((nextValue: T) => {
    latestValue.current = nextValue
    setValue(nextValue)
  }, [])

  const setItemValue = useCallback(
    async (nextValue: T) => {
      const previousValue = latestValue.current
      applyValue(nextValue)
      try {
        await item.setValue(nextValue)
      } catch (error) {
        if (latestValue.current === nextValue) applyValue(previousValue)
        throw error
      }
    },
    [item, applyValue],
  )

  useEffect(() => {
    const loadValue = async () => {
      try {
        applyValue(await item.getValue())
      } catch (error) {
        setLoadError(error instanceof Error ? error : new Error(String(error)))
      }
      setIsLoaded(true)
    }
    void loadValue()

    const unwatch = item.watch((newValue) => {
      applyValue(newValue ?? item.fallback)
    })
    return unwatch
  }, [item, applyValue])

  return [value, setItemValue, isLoaded, loadError]
}
