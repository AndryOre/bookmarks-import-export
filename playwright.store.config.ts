import { defineConfig } from '@playwright/test'

import { STORE_LOCALES } from './e2e-store/store-locales'

export default defineConfig<{ browserLocale?: string }>({
  testDir: './e2e-store',
  outputDir: './test-results/store',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  projects: STORE_LOCALES.map(({ code, browserLocale }) => ({
    name: code,
    use: { browserLocale },
  })),
})
