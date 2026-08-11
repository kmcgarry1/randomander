import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportOnFailure: true,
      // Lowering a release floor requires explicit QA/release review; see docs/testing.md.
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 88,
        lines: 85,
      },
      include: [
        'src/lib/cache.ts',
        'src/lib/operationalMetrics.ts',
        'src/lib/scryfall.ts',
        'src/lib/storage.ts',
        'src/services/**/*.ts',
        'src/stores/**/*.ts',
      ],
    },
  },
})
