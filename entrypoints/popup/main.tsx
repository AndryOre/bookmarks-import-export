import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toast'
import { applyDocumentLanguage } from '@/lib/document-language'
import { applyCachedTheme } from '@/lib/theme-cache'

import App from './App'
import './style.css'

applyCachedTheme()
applyDocumentLanguage()

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster>
        <App />
      </Toaster>
    </ThemeProvider>
  </StrictMode>,
)
