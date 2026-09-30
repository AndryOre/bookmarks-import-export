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

/**
 * Applies the persisted theme preference to the document root and keeps it
 * in sync with the operating system's color scheme when the preference is
 * `"system"`.
 * @param root0 This component's properties.
 * @param root0.children The subtree to provide the theme context to.
 * @returns The theme context provider wrapping `children`.
 */
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

      /**
       * Reacts to OS-level color scheme changes while the preference is
       * `"system"`, so the applied theme stays live instead of only being
       * resolved once when the effect first runs.
       * @param event The OS color-scheme change event.
       */
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
