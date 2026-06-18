import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should allow address selection and coupon application', async ({ page }) => {
    // Navigate to checkout
    await page.goto('/checkout');

    // Select an address (assuming mocked addresses are visible)
    // In a real flow we'd mock the network request for addresses
    await page.route('**/api/checkout/initialize', async route => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            orderId: 'order_test_123',
            amount: 5000,
            currency: 'USD',
            provider: 'RAZORPAY'
          }
        }
      });
    });

    // Apply Coupon
    await page.fill('input[placeholder*="coupon"]', 'SAVE20');
    await page.click('button:has-text("Apply")');

    // Check if discount is reflected optimistically
    await expect(page.locator('text=Discount Applied')).toBeVisible();

    // Select address radio
    const firstAddress = page.locator('input[type="radio"]').first();
    if (await firstAddress.isVisible()) {
      await firstAddress.check();
    }
  });
});
