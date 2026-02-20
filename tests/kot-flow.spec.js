// @ts-check
const { test, expect } = require('@playwright/test');

test('Complete Order Flow: Manual -> KOT -> Ready -> Paid', async ({ page }) => {
    // 1. Place Manual Order
    await page.goto('http://localhost:3000/manual-order-complete');

    // Wait for menu to load
    await page.waitForSelector('.manual-order-card', { timeout: 10000 });

    // Add first item to cart
    const firstItemAddBtn = page.locator('.manual-order-card button').first();
    await firstItemAddBtn.click();

    // Fill customer details
    await page.fill('input[placeholder="Customer Name"]', 'Test User');
    await page.fill('input[placeholder="Mobile Number"]', '9999999999');

    // Place Order
    await page.click('button:has-text("Place Order")');

    // Wait for success message or redirect
    await expect(page.locator('text=Order created successfully')).toBeVisible({ timeout: 10000 });

    // 2. KOT Processing
    await page.goto('http://localhost:3000/admin-unified?tab=KOT');

    // Look for our order (Test User)
    // We might need to reload or wait for polling
    await page.reload();
    await page.waitForTimeout(2000);

    const orderCard = page.locator('.kot-card', { hasText: 'Test User' }).first();
    // If not found immediately, might be in 'Pending' column?
    // Assuming KOT dashboard view.

    // Click "Complete" if available, or move items
    if (await orderCard.count() > 0) {
        // Find "Complete" button or "Done" button
        const completeBtn = orderCard.locator('button:has-text("Done"), button:has-text("Complete")');
        if (await completeBtn.isVisible()) {
            await completeBtn.click();
        } else {
            // Maybe items need to be marked ready first? 
            // For now, let's assume simple flow or manual override
            console.log('Could not find simple Complete button, skipping deep KOT interaction in this simple script');
        }
    }

    // 3. Verify Ready Tab
    await page.goto('http://localhost:3000/admin-unified?tab=Ready');
    await page.reload();
    await expect(page.locator('text=Test User')).toBeVisible();

    // 4. Verify Local Tab Buttons
    await page.goto('http://localhost:3000/admin-unified?tab=Local');
    const localRow = page.locator('tr', { hasText: 'Test User' });

    // Check buttons
    await expect(localRow.locator('button[title="Mark Paid"]')).toBeVisible(); // P button
    await expect(localRow.locator('button[title="Mark Ready"]')).not.toBeVisible(); // R button should be GONE

    // 5. Mark Paid
    await localRow.locator('button[title="Mark Paid"]').click();
    await expect(page.locator('text=Order updated to paid')).toBeVisible();

    // 6. Verify Gone from Ready (or moved to Paid)
    await expect(localRow.locator('button[title="Mark Paid"]')).not.toBeVisible();

    console.log('✅ Flow verification successful');
});
