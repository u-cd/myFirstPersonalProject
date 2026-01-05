import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  reporter: [['html', { outputFolder: './e2e/playwright-report' }]],

  // Run tests in files in parallel - set to false to avoid rate limiting
  fullyParallel: false,

  // Use single worker to avoid parallel auth requests and rate limiting
  workers: 1,

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',
  },

  // Configure projects for major browsers
  projects: [
    // Unauthenticated tests - test login flow without saved state (run LAST to avoid invalidating auth session)
    {
      name: 'unauthenticated',
      testMatch: '**/auth.spec.js',
    },
    // Setup project - runs first to authenticate and save state
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
      dependencies: ['unauthenticated'],
    },
    // Authenticated tests - use saved state (run BEFORE unauthenticated to avoid session invalidation)
    {
      name: 'authenticated',
      testMatch: ['**/chat-features.spec.js', '**/room-features.spec.js'],
      use: { 
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Note: For E2E tests, you should run the app with docker-compose manually
  webServer: {
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
