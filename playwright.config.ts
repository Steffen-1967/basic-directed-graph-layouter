import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for mylife-app
 * Tests the Multi-Tab Lock System and WebSocket functionality
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Important: Tests must run sequentially for lock testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  reporter: 'html',
  timeout: 30000, // 30 seconds per test
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // Disable video recording to prevent hanging
    storageState: undefined, // Force clean state (no cookies/localStorage)
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run server:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server (no conflict with manual start)
    timeout: 120 * 1000,
  },
});
