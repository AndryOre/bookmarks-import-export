import { configDefaults, defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    setupFiles: ['./lib/testing/setup-locks.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-store/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**'],
      thresholds: { lines: 80, statements: 80, branches: 50, functions: 80 },
    },
  },
})
