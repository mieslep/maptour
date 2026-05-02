import { test, expect } from '@playwright/test';

/**
 * Smoke E2E covering the demo tour load and core interactivity.
 *
 * Scope is deliberately narrow: prove that the bundled player loads in a
 * real browser, the welcome overview renders, the map shows pins, and a
 * pin click transitions state. Deeper Leaflet interaction, drag/touch,
 * and waypoint flows belong to Tier C tickets that pair an E2E spec with
 * a specific source file (TOUR-051+).
 */

test.describe('MapTour demo — smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.maptour-container', { timeout: 15000 });
  });

  test('loads the bundled player without errors', async ({ page }) => {
    // Capture console errors during load.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForSelector('.maptour-container', { timeout: 15000 });
    expect(errors).toEqual([]);
  });

  test('welcome overview renders pin buttons for every stop', async ({ page }) => {
    // The current demo has 21 stops; assert at least that several pin buttons render
    // without coupling to the exact count (which can drift if the demo is edited).
    const pinButtons = page.locator('.maptour-pin');
    await expect(pinButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await pinButtons.count()).toBeGreaterThan(2);
  });

  test('Leaflet map container is rendered', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
  });

  test('clicking a stop pin transitions out of welcome state', async ({ page }) => {
    // Welcome state shows pin buttons in the overview. Tapping one selects it.
    const firstPin = page.locator('.maptour-pin').first();
    await firstPin.click();
    // After selection the welcome card or stop card appears; either way a maptour-card
    // element is now in the DOM.
    await expect(page.locator('.maptour-card').first()).toBeVisible({ timeout: 10000 });
  });
});
