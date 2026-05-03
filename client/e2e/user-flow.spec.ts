import { test, expect } from '@playwright/test';

test.describe('ShopSmart End-to-End User Flow', () => {
  test('should navigate home, check health, and view products list', async ({ page }) => {
    // 1. Visit the Home Page
    await page.goto('/');
    
    // Check if hero title is visible
    await expect(page.locator('h1', { hasText: 'ShopSmart' })).toBeVisible();

    // Check backend health indicator is working (retry since backend might take a few seconds to boot)
    await expect(async () => {
      await page.reload();
      await expect(page.locator('text=ShopSmart Backend is running')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });

    // 2. Navigate to Products
    await page.click('text=Products');
    await page.waitForURL('/products');

    // 3. Verify Products Page
    await expect(page.locator('h1', { hasText: 'Products' })).toBeVisible();

    // Verify search bar is visible
    await expect(page.getByPlaceholder(/Search products/i)).toBeVisible();
    
    // Verify an add product form exists
    await expect(page.locator('text=Add New Product')).toBeVisible();
  });
});
