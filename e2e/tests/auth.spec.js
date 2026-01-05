import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * Tests essential login functionality and UI elements
 */

// Test credentials for real authentication flow tests
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123';

// Global delay to avoid rate limiting (60 req/min = 1 req/sec)
// Add 10-second delay after each test to stay safely under limit
test.afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 10_000));
});

test.describe('Authentication - Login Page', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Google login button should be enabled and clickable', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    await expect(googleButton).toBeEnabled();
    await expect(googleButton).toBeVisible();
    
    // Verify Google icon is present
    await expect(page.locator('button:has-text("Continue with Google") img[alt="Google"]')).toBeVisible();
  });

  test('can access Terms of Use', async ({ page }) => {
    // Switch to sign up to see the links
    await page.click('button:has-text("Sign up")');
    
    // Click Terms of Use link
    await page.click('a:has-text("Terms of Use")');
    
    // Should show terms document
    await expect(page.locator('.doc-container')).toBeVisible();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();
    
    // Close and return to chat
    await page.click('button:has-text("Close")');
    await expect(page.locator('.login-container')).toBeVisible();
  });

  test('mobile menu button visible on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check mobile menu button is now visible
    const menuButton = page.locator('button.login-menu-btn:has-text("Log in")');
    await expect(menuButton).toBeVisible();
    
    // Click menu button and check login form appears
    await menuButton.click();
    await expect(page.locator('.login-container')).toBeVisible();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  });

  test('anonymous chat is available without login', async ({ page }) => {
    // Verify chat interface is visible even when not logged in
    const chatTextarea = page.locator('textarea');
    await expect(chatTextarea).toBeVisible();
    
    // Send a test message
    await chatTextarea.fill('Hello, test message');
    await page.click('button[type="submit"].send-btn, button.send-btn');
    
    // Wait for AI response to appear (could take a few seconds)
    await expect(page.locator('.bubble.llm:not(.thinking)')).toHaveCount(1, { timeout: 15000 });
  });
});

test.describe('Authentication Flow - Real Login/Logout', () => {
  
  test('should login and logout successfully', async ({ page }) => {
    // Go to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we start at login page
    await expect(page.locator('.login-container')).toBeVisible();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
    
    // Fill in credentials and login
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('.login-form button[type="submit"]');
    
    // Wait for login to complete - user email appears in sidebar
    await expect(page.locator('.user-account-email')).toContainText(TEST_EMAIL, { timeout: 10000 });
    
    // Verify login elements are hidden
    await expect(page.locator('h2:has-text("Log in")')).not.toBeVisible();
    
    // Now test logout
    await page.click('button:has-text("Log out")');
    
    // Should return to login page
    await expect(page.locator('.login-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  });

  test('should persist session after page refresh', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('.login-form button[type="submit"]');
    
    // Wait for authenticated state - user email appears
    await expect(page.locator('.user-account-email')).toContainText(TEST_EMAIL, { timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be logged in (user email still visible)
    await expect(page.locator('.user-account-email')).toContainText(TEST_EMAIL, { timeout: 10000 });
    await expect(page.locator('h2:has-text("Log in")')).not.toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to login with wrong password
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'WrongPassword123');
    await page.click('.login-form button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.login-message')).toBeVisible({ timeout: 5000 });
    
    // Should still be on login page
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  });

  test('sign up form validation works correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Switch to sign up mode
    await page.click('button:has-text("Sign up")');
    await expect(page.locator('h2:has-text("Sign up")')).toBeVisible();
    
    // Fill form without checking agreement
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123');
    
    // Button should be enabled (button itself is not disabled)
    const submitButton = page.locator('.login-form button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    
    // Try to submit without agreement - should show error message
    await submitButton.click();
    await expect(page.locator('.login-message')).toContainText('同意', { timeout: 5000 });
    
    // Now check agreement - no error should appear after checking
    await page.check('input[type="checkbox"]#agreePolicies');
    await expect(submitButton).toBeEnabled();
    
    // Note: Not actually submitting to avoid creating real users in database
  });
});

test.describe('Page Quality', () => {
  test('should load without any console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors
    const unexpectedErrors = errors.filter(error => 
      !error.includes('429') && 
      !error.includes('Too Many Requests') &&
      !error.includes('MIME type') &&
      !error.includes('register-sw.js')
    );
    
    expect(unexpectedErrors.length).toBe(0);
  });
});
