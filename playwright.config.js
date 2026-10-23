// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Inter_OGE E2E Tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Отчёт не открывается сам: на провале он поднял бы сервер и подвесил pre-push. */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* localhost в Node может уйти на ::1, а сервер слушает только IPv4 */
    baseURL: 'http://127.0.0.1:8091',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* e2e — только chromium (решение владельца 2026-10-23) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Свой порт и без чужого сервера: `npm run serve` на 8080 может раздавать другое дерево. */
  webServer: {
    command: 'npx http-server . -a 127.0.0.1 -p 8091 -c-1 -s',
    url: 'http://127.0.0.1:8091',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
