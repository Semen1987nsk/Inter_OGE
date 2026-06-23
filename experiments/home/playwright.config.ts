import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5181',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
