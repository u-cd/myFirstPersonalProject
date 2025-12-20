import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authenticated Chat Features
 * Tests core functionality after user is logged in
 * 
 * These tests use saved authentication state from auth.setup.js
 * to avoid repeated login and rate limiting issues.
 */

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Global delay to avoid rate limiting
test.afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.describe('Authenticated Chat Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for auth state to apply
    await page.waitForTimeout(2000);
    
    // Verify we're logged in - if not, auth.setup.js needs to run first
    await expect(page.locator('.sidebar-user-account')).toContainText(TEST_EMAIL, { timeout: 10000 });
  });

  test('should start with new chat, send message, and appear in sidebar', async ({ page }) => {
    // Get initial chat count in sidebar
    const initialChatCount = await page.locator('.sidebar-chat-link').count();
    
    // Verify page loads with new chat - only welcome message (1 llm bubble)
    await expect(page.locator('.bubble.llm')).toHaveCount(1);
    await expect(page.locator('.bubble.llm').first()).toContainText('Welcome to ai語!');
    
    // User sends first message
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('Hello, this is my first message');
    await page.click('button.send-btn');
    
    // Verify user message appears
    await expect(page.locator('.bubble.user')).toHaveCount(1);
    
    // Wait for AI response - should now have 2 llm bubbles (welcome + response)
    await expect(page.locator('.bubble.llm:not(.thinking)')).toHaveCount(2, { timeout: 20000 });
    
    // Wait for sidebar to update with new chat
    await page.waitForTimeout(2000);
    
    // Verify new chat link appears in sidebar
    const finalChatCount = await page.locator('.sidebar-chat-link').count();
    expect(finalChatCount).toBeGreaterThan(initialChatCount);
  });

  test('should load past chat, see history, and send new message', async ({ page }) => {
    // Ensure we have at least one existing chat in sidebar
    const chatLinks = page.locator('.sidebar-chat-link');
    const chatCount = await chatLinks.count();
    
    if (chatCount === 0) {
      // Create a chat first for testing
      const textarea = page.locator('textarea.chat-input');
      await textarea.fill('Setup message for chat history test');
      await page.click('button.send-btn');
      await expect(page.locator('.bubble.llm:not(.thinking)')).toHaveCount(2, { timeout: 20000 });
      await page.waitForTimeout(2000);
    }
    
    // Click on first chat in sidebar to load history
    await page.locator('.sidebar-chat-link').first().click();
    await page.waitForTimeout(1000);
    
    // Verify chat history loaded - should have past messages (user + llm messages)
    const messageCount = await page.locator('.bubble.user, .bubble.llm').count();
    expect(messageCount).toBeGreaterThan(1); // At least welcome message + user message
    
    // Verify at least one user message exists from history
    await expect(page.locator('.bubble.user').first()).toBeVisible();
    
    // Get current message count before sending new message
    const beforeMessageCount = await page.locator('.bubble.user, .bubble.llm:not(.thinking)').count();
    
    // Send new message in this chat
    const textarea = page.locator('textarea.chat-input');
    await textarea.fill('This is a test, please respond');
    await page.click('button.send-btn');
    
    // Verify new user message appears
    await expect(page.locator('.bubble.user').last()).toContainText('This is a test, please respond');
    
    // Wait for AI response - should have added 2 messages (user + AI response)
    await expect(page.locator('.bubble.user, .bubble.llm:not(.thinking)')).toHaveCount(beforeMessageCount + 2, { timeout: 20000 });
  });

  test('should open and close sidebar with mobile menu button', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify we're logged in
    await expect(page.locator('.sidebar-user-account')).toContainText(TEST_EMAIL, { timeout: 5000 });
    
    // Verify mobile menu button is visible
    const mobileMenuBtn = page.locator('.mobile-menu-btn');
    await expect(mobileMenuBtn).toBeVisible();
    
    // Click mobile menu button
    await mobileMenuBtn.click();
    await page.waitForTimeout(300);
    
    // Verify sidebar appears (has sidebar-open class)
    await expect(page.locator('.sidebar-content-wrapper.sidebar-open')).toBeVisible();
    
    // Verify overlay is active
    await expect(page.locator('.sidebar-overlay.active')).toBeVisible();
    
    // Click outside sidebar (on the overlay) to close - click on right edge where sidebar doesn't overlap
    await page.click('.sidebar-overlay.active', { position: { x: 300, y: 200 }, force: true });
    await page.waitForTimeout(300);
    
    // Verify sidebar is closed (no sidebar-open class)
    await expect(page.locator('.sidebar-content-wrapper.sidebar-open')).not.toBeVisible();
  });
});
