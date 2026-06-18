import { test, expect } from '@playwright/test';

test('has title and welcomes the user', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/ShopSmart/);

  // Check for the main heading
  const heading = page.getByRole('heading', { name: /ShopSmart/i });
  await expect(heading).toBeVisible();

  // Check for navigation link to products
  const browseLink = page.getByRole('link', { name: /Browse Products/i });
  await expect(browseLink).toBeVisible();
});

test('can navigate to products page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Browse Products/i }).click();

  await expect(page).toHaveURL(/.*products/);
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
});
