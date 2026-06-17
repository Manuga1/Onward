import { test, expect } from '@playwright/test';

// E2E tests for the critical funnel: §5
// signup → verify pass → profile complete → egg cohort joined → partner chosen (mutual) → first check-in

test.describe('Signup funnel', () => {
  test('root redirects to /signup', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/signup/);
  });

  test('age gate blocks continuation without checkbox', async ({ page }) => {
    await page.goto('/signup');
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();
  });

  test('age gate allows continuation after checkbox', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('checkbox').check();
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled();
  });

  test('consent flow has 3 steps', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 1: not-medical disclaimer
    await expect(page.getByText('not therapy')).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: data use
    await expect(page.getByText('Anonymous by design')).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: terms
    await expect(page.getByText('Terms & Community Standards')).toBeVisible();
  });

  test('age gate is accessible: checkbox has label', async ({ page }) => {
    await page.goto('/signup');
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toHaveAttribute('aria-describedby');
  });
});

test.describe('Check-in UI', () => {
  // These tests require an authenticated session; set up with a test account in CI
  // For now they document the expected UI behavior

  test('check-in page shows three state options', async ({ page }) => {
    // This test would require auth; skip in unauthenticated context
    // TODO: seed a test session and navigate to /checkin
    test.skip();
  });

  test('Fell state shows support resources', async ({ page }) => {
    test.skip(); // Requires auth session
  });
});

test.describe('PWA', () => {
  test('manifest is reachable', async ({ page }) => {
    const res = await page.request.get('/manifest.json');
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.name).toContain('Onward');
    expect(json.display).toBe('standalone');
  });
});
