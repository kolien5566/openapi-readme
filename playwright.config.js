import { defineConfig, devices } from '@playwright/test'

const playwrightOutputDir = './playwright-output'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  outputDir: `${playwrightOutputDir}/test-results`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${playwrightOutputDir}/report`, open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
