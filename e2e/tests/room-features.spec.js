import { test, expect } from '@playwright/test';

// Global delay to avoid rate limiting (60 req/min = 1 req/sec)
// Add 10-second delay after each test to stay safely under limit
test.afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 10_000));
});

test.describe('Room Mode - Create and Join Room', () => {
  test.use({ storageState: 'e2e/.auth/user.json' }); // Use authenticated state

  test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      // Ensure Rooms mode is active
      const roomsTab = page.locator('.chatapp-topbar button:has-text("Rooms")');
      if (!(await roomsTab.getAttribute('class')).includes('active')) {
        await roomsTab.click();
      }
      await expect(roomsTab).toHaveClass(/active/);
    });

    test('should have correct structure, topbar tabs, and mode switching', async ({ page }) => {
        // Check main structural elements
        await expect(page.locator('.chatapp-topbar')).toBeVisible();
        await expect(page.locator('.chatapp-mainarea')).toBeVisible();

        // Check topbar contains Solo Chat and Rooms tabs
        const soloTab = page.locator('.chatapp-topbar button:has-text("Solo Chat")');
        const roomsTab = page.locator('.chatapp-topbar button:has-text("Rooms")');
        await expect(soloTab).toBeVisible();
        await expect(roomsTab).toBeVisible();

        // Check mode switching works
        // Start in Rooms mode
        await expect(roomsTab).toHaveClass(/active/);
        await expect(soloTab).not.toHaveClass(/active/);
        // Switch to Solo Chat mode
        await soloTab.click();
        await expect(soloTab).toHaveClass(/active/);
        await expect(roomsTab).not.toHaveClass(/active/);
        // Switch back to Rooms mode
        await roomsTab.click();
        await expect(roomsTab).toHaveClass(/active/);
        await expect(soloTab).not.toHaveClass(/active/);
    });

    test('should show public rooms and contain Roomsへようこそ(^^)', async ({ page }) => {
                // Click 'Show Public Rooms' in the sidebar
                const showPublicRoomsBtn = page.locator('.sidebar button:has-text("Show Public Rooms")');
                await expect(showPublicRoomsBtn).toBeVisible();
                await showPublicRoomsBtn.click();

                // Wait for public room list to appear
                const publicRoomList = page.locator('.public-room-list-scrollable');
                await expect(publicRoomList).toBeVisible();

                // Check that at least one room has the exact name 'Roomsへようこそ(^^)'
                const roomName = 'Roomsへようこそ(^^)';
                const roomTitleLocators = publicRoomList.locator('.public-room-entry .room-title-wrap strong');
                const count = await roomTitleLocators.count();
                let found = false;
                for (let i = 0; i < count; i++) {
                    const text = await roomTitleLocators.nth(i).innerText();
                    if (text.trim() === roomName) {
                        found = true;
                        break;
                    }
                }
                expect(found).toBeTruthy();
    });

    test('should show Create Room button enabled and visible', async ({ page }) => {
        // Click "Show Public Rooms" if needed
        const showPublicRoomsBtn = page.locator('button:has-text("Show Public Rooms")');
            if (await showPublicRoomsBtn.isVisible()) {
                await showPublicRoomsBtn.click();
        }

        // Check Create Room FAB is visible and enabled
        const createRoomBtn = page.locator('button.fab-create-room-inside');
        await expect(createRoomBtn).toBeVisible();
        await expect(createRoomBtn).toBeEnabled();

        // Open the create room modal
        await createRoomBtn.click();

        // Check room name and description inputs are visible and enabled
        const nameInput = page.locator('input.sidebar-create-room-input');
        const descInput = page.locator('textarea.sidebar-create-room-textarea');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toBeEnabled();
        await expect(descInput).toBeVisible();
        await expect(descInput).toBeEnabled();

        // Optionally, check you can type in them (but do not submit)
        await nameInput.fill('Test Room Name');
        await descInput.fill('Test Room Description');
        await expect(nameInput).toHaveValue('Test Room Name');
        await expect(descInput).toHaveValue('Test Room Description');
    });

    test('should open a specific room from sidebar, send a Japanese message, and see English translation', async ({ page }) => {
        // Ensure Rooms mode is active
        const roomsTab = page.locator('.chatapp-topbar button:has-text("Rooms")');
        if (!(await roomsTab.getAttribute('class')).includes('active')) {
            await roomsTab.click();
        }
        await expect(roomsTab).toHaveClass(/active/);

        // Find the room in the sidebar by its name (not in public list)
        const sidebarRoomBtn = page.locator('.sidebar .sidebar-chat-link', { hasText: 'testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttes' });
        await expect(sidebarRoomBtn).toBeVisible();
        await sidebarRoomBtn.click();

        // Wait for the room chat to load
        await expect(page.locator('.room-header .room-title')).toHaveText('testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttes');

        // Send a Japanese message
        const testMessage = 'これは翻訳テスト用の日本語メッセージです。';
        const input = page.locator('.chat-input');
        await input.fill(testMessage);
        const sendBtn = page.locator('.send-btn');
        await expect(sendBtn).toBeEnabled();
        await sendBtn.click();

        // Wait for the translated message to appear in the chat (as my-message-content)
        // The translated message should be in English and should not contain Japanese characters
        const myMsgs = page.locator('.my-message-content');
        await expect(myMsgs.first()).toBeVisible({ timeout: 15000 });
        const count = await myMsgs.count();
        expect(count).toBeGreaterThan(0);
        const lastMsg = myMsgs.nth(count - 1);
        const lastMsgText = await lastMsg.textContent();
        expect(lastMsgText && lastMsgText.trim().length > 0).toBeTruthy();
        // Assert that lastMsgText does NOT contain Japanese characters (hiragana, katakana, kanji)
        expect(/[\u3040-\u30FF\u4E00-\u9FFF]/.test(lastMsgText)).toBeFalsy();
    });

    test('should show translation under message when message is clicked', async ({ page }) => {
        // Ensure Rooms mode is active
        const roomsTab = page.locator('.chatapp-topbar button:has-text("Rooms")');
        if (!(await roomsTab.getAttribute('class')).includes('active')) {
            await roomsTab.click();
        }
        await expect(roomsTab).toHaveClass(/active/);

        // Find the room in the sidebar by its name (not in public list)
        const sidebarRoomBtn = page.locator('.sidebar .sidebar-chat-link', { hasText: 'testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttes' });
        await expect(sidebarRoomBtn).toBeVisible();
        await sidebarRoomBtn.click();

        // Wait for the room chat to load
        await expect(page.locator('.room-header .room-title')).toHaveText('testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttes');

        // Wait for at least one message to appear (either my-message-content or other-message-content)
        const anyMsg = page.locator('.room-message-content');
        await expect(anyMsg.first()).toBeVisible({ timeout: 15000 });

        // Click the first message
        await anyMsg.first().click();

        // The translation should appear directly under the clicked message (as .room-message-translation-ja)
        // Find the parent message div
        const parentDiv = anyMsg.first().locator('..');
        // Wait for translation to appear as a child of the same parent
        const translation = parentDiv.locator('.room-message-translation-ja');
        await expect(translation).toBeVisible({ timeout: 15000 });
        
        // Wait until translation is not 'Translating...' and not empty
        await expect(async () => {
            const text = await translation.textContent();
            expect(text && text.trim().length > 0).toBeTruthy();
            expect(text.trim()).not.toBe('Translating...');
        }).toPass({ timeout: 15000 });

        // Now check that translation contains Japanese characters
        const translationText = await translation.textContent();
        expect(/[\u3040-\u30FF\u4E00-\u9FFF]/.test(translationText)).toBeTruthy();
    });
});
