import { defineConfig } from '@playwright/test'

export default defineConfig<{ browserLocale: string }>({
  testDir: './e2e-store',
  outputDir: './test-results/store',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  projects: [
    { name: 'en', use: { browserLocale: 'en' } },
    { name: 'es', use: { browserLocale: 'es' } },
  ],
})
