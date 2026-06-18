import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja E2E (smoke). Uruchomienie: `npm run test:e2e`.
 * webServer startuje dev (lub reuse istniejącego). Ścieżka uwierzytelniona
 * wymaga zmiennych E2E_USER / E2E_PASS (inaczej jest pomijana).
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
