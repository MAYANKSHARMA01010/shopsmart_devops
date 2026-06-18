import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL('/');

    // Check if user is logged in (e.g. Profile or Logout button appears)
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should display error on invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Check for toast error or inline error
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
