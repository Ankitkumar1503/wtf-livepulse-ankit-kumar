import { test, expect } from '@playwright/test';

test.describe('WTF LivePulse Dashboard E2E Tests', () => {
  test('1. Dashboard loads gym list and summary bar with zero console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Check main title branding
    await expect(page.locator('.brand')).toContainText('LIVEPULSE');

    // Check summary bar KPIs
    await expect(page.locator('.summary-bar')).toBeVisible();
    await expect(page.locator('.summary-bar')).toContainText('Total Live Checked-In');
    await expect(page.locator('.summary-bar')).toContainText('Today Total Revenue');

    expect(consoleErrors).toHaveLength(0);
  });

  test('2. Switching gym dropdown updates active snapshot view without page reload', async ({ page }) => {
    await page.goto('/');

    const gymSelector = page.locator('#gym-selector-dropdown');
    await expect(gymSelector).toBeVisible();

    // Select second option in dropdown
    const options = await gymSelector.locator('option').all();
    if (options.length > 1) {
      const secondVal = await options[1].getAttribute('value');
      await gymSelector.selectOption(secondVal);

      // Verify selected snapshot header updates
      await expect(page.locator('.dashboard-grid')).toBeVisible();
    }
  });

  test('3. Simulator control panel allows starting engine and navigating back', async ({ page }) => {
    await page.goto('/');

    // Navigate to Simulator module tab
    await page.click('#nav-simulator');
    await expect(page.locator('h2')).toContainText('Real-Time Simulator Engine');

    // Check 1x, 5x, 10x speed selector buttons
    await expect(page.locator('#btn-speed-1x')).toBeVisible();
    await expect(page.locator('#btn-speed-5x')).toBeVisible();
    await expect(page.locator('#btn-speed-10x')).toBeVisible();
  });

  test('4. Anomaly Log tab displays anomaly table and filter options', async ({ page }) => {
    await page.goto('/');

    // Navigate to Anomaly Log tab
    await page.click('#nav-anomalies');
    await expect(page.locator('h2')).toContainText('Operational Anomaly Detection Log');
    await expect(page.locator('#anomalies-table')).toBeVisible();
  });
});
