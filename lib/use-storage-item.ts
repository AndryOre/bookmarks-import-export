import type { WxtStorageItem } from '#imports'
import { useEffect, useState } from 'react'

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
