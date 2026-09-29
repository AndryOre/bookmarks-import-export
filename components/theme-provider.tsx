import { createContext, useEffect } from 'react'

import { themeStore } from '@/lib/storage'
import { useStorageItem } from '@/lib/use-storage-item'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderContextValue {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
}

const ThemeProviderContext = createContext<
  ThemeProviderContextValue | undefined
>(undefined)

interface ThemeProviderProperties {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children }: ThemeProviderProperties) {
  const [theme, setThemeInStorage] = useStorageItem(themeStore)

  useEffect(() => {
    const root = document.documentElement

    function applyTheme(resolvedTheme: 'dark' | 'light') {
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)
    }

    if (theme === 'system') {
      const mql = globalThis.matchMedia('(prefers-color-scheme: dark)')

      applyTheme(mql.matches ? 'dark' : 'light')

      // BUG FIX #4: el original no tenía este listener.
      // "system" ahora responde en tiempo real al cambiar el tema del SO.
      const handleChange = (event: MediaQueryListEvent) => {
        applyTheme(event.matches ? 'dark' : 'light')
      }

      mql.addEventListener('change', handleChange)
      return () => mql.removeEventListener('change', handleChange)
    }
    applyTheme(theme)
  }, [theme])

  const setTheme = async (newTheme: Theme) => {
    await setThemeInStorage(newTheme)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
