import { defineConfig, devices } from '@playwright/test'

const isCi = Boolean(process.env.CI)
const responsiveEvidence = /\[responsive evidence\]/

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : undefined,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      grepInvert: responsiveEvidence,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-firefox',
      grepInvert: responsiveEvidence,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-webkit',
      grepInvert: responsiveEvidence,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      grepInvert: responsiveEvidence,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-webkit',
      grepInvert: responsiveEvidence,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'responsive-chromium',
      grep: responsiveEvidence,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 844 },
      },
    },
    {
      name: 'responsive-webkit',
      grep: responsiveEvidence,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 320, height: 844 },
      },
    },
  ],
})
