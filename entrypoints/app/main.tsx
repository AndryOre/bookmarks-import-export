import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toast'

import '../popup/style.css'
import { AppRouter } from './router'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster>
        <AppRouter />
      </Toaster>
    </ThemeProvider>
  </StrictMode>,
)
