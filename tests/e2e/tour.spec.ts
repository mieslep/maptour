import { test, expect } from '@playwright/test';

test.describe('MapTour demo tour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the tour to load — map pane should appear
    await page.waitForSelector('.maptour-map-pane', { timeout: 15000 });
    // Wait for the stop card to render
    await page.waitForSelector('.maptour-card__title', { timeout: 10000 });
  });

  test('loads the Enniscorthy tour title', async ({ page }) => {
    const title = await page.textContent('.maptour-card__title');
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(0);
  });

  test('renders all 6 stops in the stop list', async ({ page }) => {
    const items = await page.locator('.maptour-stop-list__item').count();
    expect(items).toBe(6);
  });

  test('shows stop numbers 1-6 in the list', async ({ page }) => {
    const numbers = await page.locator('.maptour-stop-list__number').allTextContents();
    expect(numbers).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  test('first stop is active on load', async ({ page }) => {
    const activeItem = page.locator('.maptour-stop-list__item--active');
    await expect(activeItem).toHaveCount(1);
    const badge = await page.textContent('.maptour-card__badge');
    expect(badge).toContain('1');
  });

  test('Next button advances to stop 2', async ({ page }) => {
    await page.click('#maptour-next');
    const badge = await page.textContent('.maptour-card__badge');
    expect(badge).toContain('2');
  });

  test('Prev button is disabled on first stop', async ({ page }) => {
    const prevBtn = page.locator('#maptour-prev');
    await expect(prevBtn).toBeDisabled();
  });

  test('navigates through all 6 stops with Next', async ({ page }) => {
    for (let i = 2; i <= 6; i++) {
      await page.click('#maptour-next');
      const badge = await page.textContent('.maptour-card__badge');
      expect(badge).toContain(String(i));
    }
    // Next should now be disabled
    const nextBtn = page.locator('#maptour-next');
    await expect(nextBtn).toBeDisabled();
  });

  test('Prev navigates backward', async ({ page }) => {
    await page.click('#maptour-next');
    await page.click('#maptour-next');
    await page.click('#maptour-prev');
    const badge = await page.textContent('.maptour-card__badge');
    expect(badge).toContain('2');
  });

  test('clicking a stop in the list jumps to it', async ({ page }) => {
    // Click stop 4 directly
    const items = page.locator('.maptour-stop-list__item');
    await items.nth(3).click(); // index 3 = stop 4
    const badge = await page.textContent('.maptour-card__badge');
    expect(badge).toContain('4');
  });

  test('"Take me there" button appears on each stop', async ({ page }) => {
    const btn = page.locator('.maptour-nav-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText('Take me there');
  });

  test('stop card content renders for stop 1', async ({ page }) => {
    // Stop 1 has text, image, and gallery blocks
    await expect(page.locator('.maptour-block--text')).toBeVisible();
    await expect(page.locator('.maptour-block--image')).toBeVisible();
    await expect(page.locator('.maptour-block--gallery')).toBeVisible();
  });

  test('map pane is present', async ({ page }) => {
    const mapPane = page.locator('.maptour-map-pane');
    await expect(mapPane).toBeVisible();
    // Leaflet canvas/svg should be inside
    const leafletContainer = page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible();
  });

  test('responsive layout: mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const container = page.locator('.maptour-container');
    await expect(container).toBeVisible();
    const mapPane = page.locator('.maptour-map-pane');
    await expect(mapPane).toBeVisible();
  });

  test('responsive layout: desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const container = page.locator('.maptour-container');
    await expect(container).toBeVisible();
  });
});
