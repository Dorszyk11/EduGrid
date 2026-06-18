import { test, expect } from '@playwright/test';

/**
 * Smoke E2E — ścieżki krytyczne. Ścieżka uwierzytelniona wymaga konta testowego
 * (E2E_USER / E2E_PASS) i zasianych danych; bez nich jest pomijana.
 */
test.describe('Smoke', () => {
  test('strona logowania renderuje formularz', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Zaloguj się/i })).toBeVisible();
  });

  const E2E_USER = process.env.E2E_USER;
  const E2E_PASS = process.env.E2E_PASS;

  test('logowanie → dashboard → przydział → realizacja', async ({ page }) => {
    test.skip(!E2E_USER || !E2E_PASS, 'Ustaw E2E_USER i E2E_PASS, by uruchomić ścieżkę uwierzytelnioną');

    await page.goto('/');
    await page.locator('#email').fill(E2E_USER!);
    await page.locator('#password').fill(E2E_PASS!);
    await page.getByRole('button', { name: /Zaloguj się/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });

    await page.goto('/przydzial');
    await expect(page.getByRole('heading', { name: /Przydzia/i }).first()).toBeVisible();

    await page.goto('/realizacja');
    await expect(page.getByText(/Realizacja/i).first()).toBeVisible();
  });
});
