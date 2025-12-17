import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  
  // Maximum time one test can run for
  timeout: 30 * 1000,
  
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000
  },
  
  // Run tests in files in parallel - set to false to avoid rate limiting
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Use single worker to avoid parallel auth requests and rate limiting
  workers: 1,
  
  // Reporter to use
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs first to authenticate and save state
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
    // Authenticated tests - use saved state (run BEFORE unauthenticated to avoid session invalidation)
    {
      name: 'authenticated',
      testMatch: '**/chat-features.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Unauthenticated tests - test login flow without saved state (run LAST to avoid invalidating auth session)
    {
      name: 'unauthenticated',
      testMatch: '**/auth.spec.js',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['authenticated'],
    },
  ],

  // Run your local dev server before starting the tests
  // Note: For E2E tests, you should run the app with docker-compose manually
  // Command: docker-compose up
  // Then run tests with existing server
  webServer: {
    command: 'docker compose up',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 3 minutes for Docker container startup
  },
});
