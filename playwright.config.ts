import { defineConfig, devices } from '@playwright/test'

/**
 * Staging smoke for suite use-case testing.
 * Env: E2E_BASE_URL · E2E_USER · E2E_PASSWORD (see knowledge/paths.md)
 */
const baseURL =
  process.env.E2E_BASE_URL?.trim() || 'https://plexon-v3.projects-a.plygrnd.tech'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
