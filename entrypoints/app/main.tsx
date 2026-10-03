import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toast'
import { applyDocumentLanguage } from '@/lib/document-language'
import { applyCachedTheme } from '@/lib/theme-cache'

import '../popup/style.css'
import { AppRouter } from './router'

applyCachedTheme()
applyDocumentLanguage()

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster>
        <AppRouter />
      </Toaster>
    </ThemeProvider>
  </StrictMode>,
)
