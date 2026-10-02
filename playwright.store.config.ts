import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-store',
  outputDir: './test-results/store',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  projects: [{ name: 'en' }],
})
