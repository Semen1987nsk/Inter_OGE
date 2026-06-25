import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright конфиг для E2E-тестов kit-3-circuits.
 *
 * testDir='./e2e' — критично. Без явного testDir Playwright рекурсивно
 * ищет все *.test.ts/*.spec.ts в src/ и пытается запускать vitest-файлы,
 * что приводит к конфликту "Cannot redefine property: Symbol($$jest-matchers-object)".
 *
 * Запускается на 3 устройствах. webServer — vite preview на изолированном порту.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts', // только .spec.ts, .test.ts — это vitest
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4187',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet-touch', use: { ...devices['iPad (gen 7)'] } },
    { name: 'mobile-touch', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4187',
    url: 'http://localhost:4187',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
