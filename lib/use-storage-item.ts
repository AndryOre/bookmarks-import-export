import { useState, useEffect } from 'react';
import type { WxtStorageItem } from '#imports';

export function useStorageItem<T>(
  item: WxtStorageItem<T, Record<string, unknown>>
): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(item.fallback);

  useEffect(() => {
    item.getValue().then(setValue);
    const unwatch = item.watch((newValue) => {
      setValue(newValue ?? item.fallback);
    });
    return unwatch;
  }, [item]);

  return [value, item.setValue.bind(item)];
}
