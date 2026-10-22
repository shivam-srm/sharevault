import { expect, test } from '@playwright/test'

test('public homepage shows its title and primary heading', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/ShareVault/)
  await expect(
    page.getByRole('heading', { name: /Send files at the speed of thought/i }),
  ).toBeVisible()
})
