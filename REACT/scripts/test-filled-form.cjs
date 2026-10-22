const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5174/superadmin/locations', { waitUntil: 'networkidle' });

  if (page.url().includes('/roles') || page.url().includes('/login')) {
    const superAdminBtn = page.locator('text=Super Admin').first();
    if (await superAdminBtn.count() > 0) await superAdminBtn.click();
    await page.waitForTimeout(1000);
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('super@sherry.com');
      await page.locator('input[type="password"]').fill('sherry');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }
    await page.goto('http://127.0.0.1:5174/superadmin/locations', { waitUntil: 'networkidle' });
  }

  // Click Add Location
  await page.locator('button:has-text("Add Location")').click();
  await page.waitForTimeout(600);

  // Click City Select to open dropdown
  const citySelect = page.locator('[data-slot="select-trigger"]:has-text("Select City")');
  if (await citySelect.count() > 0) {
    await citySelect.click();
    await page.waitForTimeout(500);
    // Pick first city (e.g., Achalpur)
    const firstOption = page.locator('[data-slot="select-item"]').first();
    if (await firstOption.count() > 0) {
      await firstOption.click();
      await page.waitForTimeout(400);
    }
  }

  // Fill in Area AFTER selecting city
  const areaInput = page.locator('input[placeholder*="Area"]');
  if (await areaInput.count() > 0) {
    await areaInput.fill('Civil Lines');
  }

  // Fill in Pricing
  const priceInput = page.locator('input[placeholder="500"]');
  await priceInput.fill('1500');

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'dialog-filled-form-with-preview.png') });

  // Let's also inspect delete dialog
  // Close dialog first
  await page.locator('button:has-text("Cancel")').click();
  await page.waitForTimeout(500);

  // Click Delete button on first row if present
  const deleteBtn = page.locator('button[aria-label*="Delete location"]').first();
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(__dirname, 'dialog-delete.png') });
  }

  await browser.close();
  console.log('Testing done!');
})();
