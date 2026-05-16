import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright конфиг для E2E-тестов.
 *
 * Запускает свой dev-server (vite preview) перед тестами.
 * Тестируется на трёх устройствах: desktop, iPad (touch-эмуляция для интерактивных панелей), iPhone.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4183',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet-touch',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'mobile-touch',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4183',
    url: 'http://localhost:4183',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
