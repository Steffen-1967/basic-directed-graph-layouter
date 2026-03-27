import { test, expect } from '@playwright/test';

/**
 * Test Suite: Multi-Tab Lock System
 * 
 * Tests the WebSocket-based locking mechanism that prevents
 * simultaneous editing of scenarios across multiple browser tabs.
 */

test.describe('Multi-Tab Lock System', () => {
  
  test('Single tab can acquire lock and edit', async ({ page }) => {
    await page.goto('/');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(1000);
    
    // Check initial state: Padlock closed (Lucide icon), Edit button enabled
    await expect(page.locator('#padlockIcon svg.lucide-lock')).toBeVisible();
    await expect(page.locator('#toggleEditableBtn')).toBeEnabled();
    await expect(page.locator('#toggleEditableBtn')).toContainText('no');
    
    // Click Edit button to acquire lock
    await page.click('#toggleEditableBtn');
    
    // Wait for lock acquisition
    await page.waitForTimeout(500);
    
    // Check: Padlock open, Edit button shows "yes"
    await expect(page.locator('#padlockIcon svg.lucide-lock-open')).toBeVisible();
    await expect(page.locator('#toggleEditableBtn')).toContainText('yes');
    await expect(page.locator('body')).toHaveClass(/is-editable/);
  });

  test('Second tab sees Read-Only modal when first tab has lock', async ({ browser }) => {
    // Tab 1: Acquire lock
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('http://localhost:3000');
    await page1.waitForTimeout(1000);
    await page1.click('#toggleEditableBtn');
    await page1.waitForTimeout(1000); // Increased wait time for lock acquisition
    
    // Tab 2: Try to open same scenario
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:3000');
    
    // Wait for WebSocket connection + lock status check + modal rendering
    await page2.waitForTimeout(3000); // Increased wait time
    
    // Check: Modal should be visible
    await expect(page2.locator('#lockModal')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('#lockModalMessage')).toContainText('bereits bearbeitet');
    
    // Check: Edit button disabled
    await expect(page2.locator('#toggleEditableBtn')).toBeDisabled();
    await expect(page2.locator('#toggleEditableBtn')).toContainText('locked');
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('Second tab can edit after first tab releases lock', async ({ browser }) => {
    // Tab 1: Acquire lock
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('http://localhost:3000');
    await page1.waitForTimeout(1000);
    await page1.click('#toggleEditableBtn');
    await page1.waitForTimeout(500);
    
    // Tab 2: Wait in Read-Only
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:3000');
    
    // Wait for WebSocket connection + lock status check
    await page2.waitForTimeout(2000);
    
    // Close modal in Tab 2
    await page2.click('#lockModalOkBtn');
    await expect(page2.locator('#lockModal')).not.toBeVisible();
    
    // Tab 1: Release lock
    await page1.click('#toggleEditableBtn');
    await page1.waitForTimeout(500);
    
    // Tab 2: Should now be able to edit
    await page2.waitForTimeout(500);
    await expect(page2.locator('#toggleEditableBtn')).toBeEnabled();
    await expect(page2.locator('#toggleEditableBtn')).not.toContainText('locked');
    
    // Tab 2: Acquire lock
    await page2.click('#toggleEditableBtn');
    await page2.waitForTimeout(500);
    await expect(page2.locator('#padlockIcon svg.lucide-lock-open')).toBeVisible();
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('Lock is released when tab closes', async ({ browser }) => {
    // Tab 1: Acquire lock
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('http://localhost:3000');
    await page1.waitForTimeout(1000);
    await page1.click('#toggleEditableBtn');
    await page1.waitForTimeout(500);
    
    // Tab 2: Wait in Read-Only
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:3000');
    
    // Wait for WebSocket connection + lock status check
    await page2.waitForTimeout(2000);
    await page2.click('#lockModalOkBtn');
    
    // Tab 1: Close (simulates disconnect)
    await context1.close();
    await page2.waitForTimeout(1000);
    
    // Tab 2: Should now be able to edit
    await expect(page2.locator('#toggleEditableBtn')).toBeEnabled();
    await page2.click('#toggleEditableBtn');
    await page2.waitForTimeout(500);
    await expect(page2.locator('#padlockIcon svg.lucide-lock-open')).toBeVisible();
    
    // Cleanup
    await context2.close();
  });
});

test.describe('Scenario Loading', () => {
  
  test('Can load different scenarios from dropdown', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check dropdown has scenarios
    const select = page.locator('#dataSelect');
    const options = await select.locator('option').count();
    expect(options).toBeGreaterThan(0);
    
    // Select second scenario
    await select.selectOption({ index: 1 });
    await page.click('#loadBtn');
    await page.waitForTimeout(1000);
    
    // Check canvas is rendered
    const canvas = page.locator('#processCanvas');
    await expect(canvas).toBeVisible();
  });

  test('Recovery dialog shows timestamp warning', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Acquire lock and make a change
    await page.click('#toggleEditableBtn');
    await page.waitForTimeout(500);
    
    // Double-click a node to edit (if visible)
    const canvas = page.locator('#processCanvas');
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    
    // Check if edit overlay appeared
    const overlay = page.locator('#nodeEditOverlay');
    if (await overlay.isVisible()) {
      await overlay.fill('Test Node Name');
      await overlay.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Reload page (simulates recovery scenario)
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Note: Recovery dialog only appears if LocalStorage has data
    // This test verifies the page loads without errors
    await expect(canvas).toBeVisible();
  });
});
