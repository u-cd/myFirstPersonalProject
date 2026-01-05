import { test as setup, expect } from '@playwright/test';

/**
 * Authentication setup - runs once before authenticated tests
 * Logs in and saves authentication state to avoid rate limiting
 */

const authFile = 'e2e/.auth/user.json';

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123';

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('.login-form button[type="submit"]');
  
  // Wait for successful login
  await expect(page.locator('.user-account-email')).toContainText(TEST_EMAIL, { timeout: 10000 });
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
