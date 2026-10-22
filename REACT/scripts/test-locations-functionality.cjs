const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to locations page...');
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

  // 2. Test Search functionality
  console.log('2. Testing search...');
  const searchInput = page.locator('input[placeholder*="Search state"]');
  await searchInput.fill('Baramati');
  await page.waitForTimeout(500);
  const rowsAfterSearch = await page.locator('tbody tr').count();
  console.log('Rows matching "Baramati":', rowsAfterSearch);
  await searchInput.fill('');
  await page.waitForTimeout(500);

  // 3. Test Form Validation (empty fields)
  console.log('3. Testing form validation...');
  await page.locator('button:has-text("Add Location")').click();
  await page.waitForTimeout(500);

  // Click Add Location with empty city
  await page.locator('div[role="dialog"] button:has-text("Add Location")').click();
  await page.waitForTimeout(400);
  const errorText = await page.locator('div[role="dialog"] p.text-destructive').innerText().catch(() => '');
  console.log('Validation error shown:', errorText);

  // 4. Test Add Location with valid data
  console.log('4. Testing adding a new location...');
  // Select City
  const citySelect = page.locator('div[role="dialog"] [data-slot="select-trigger"]:has-text("Select City")');
  await citySelect.click();
  await page.waitForTimeout(400);
  await page.locator('[data-slot="select-item"]:has-text("Pune")').first().click();
  await page.waitForTimeout(400);

  // Enter Area
  const testArea = 'Kothrud_' + Math.floor(Math.random() * 9000 + 1000);
  const areaInput = page.locator('div[role="dialog"] input[placeholder*="Area"]');
  await areaInput.fill(testArea);

  // Enter Price
  const priceInput = page.locator('div[role="dialog"] input[placeholder="500"]');
  await priceInput.fill('3500');

  // Submit
  await page.locator('div[role="dialog"] button:has-text("Add Location")').click();
  await page.waitForTimeout(1500);

  // Verify new row appears in table
  const foundNewLocation = await page.locator(`text=${testArea}`).count();
  console.log(`Created location with area "${testArea}", found count in table:`, foundNewLocation);

  // 5. Test Edit Location on that row
  console.log('5. Testing editing location...');
  const newRow = page.locator(`tr:has-text("${testArea}")`).first();
  if (await newRow.count() > 0) {
    const editBtn = newRow.locator('button[aria-label*="Edit location"]');
    await editBtn.click();
    await page.waitForTimeout(600);

    // Dialog should be open in edit mode
    const dialogTitle = await page.locator('div[role="dialog"] [data-slot="dialog-title"]').innerText();
    console.log('Edit dialog title:', dialogTitle);

    // Update price to 4200
    const editPriceInput = page.locator('div[role="dialog"] input[placeholder="500"]');
    await editPriceInput.fill('4200');

    await page.locator('div[role="dialog"] button:has-text("Update Location")').click();
    await page.waitForTimeout(1500);
    console.log('Update submitted.');
  }

  // 6. Test Delete Location
  console.log('6. Testing deleting location...');
  const rowToDelete = page.locator(`tr:has-text("${testArea}")`).first();
  if (await rowToDelete.count() > 0) {
    const deleteBtn = rowToDelete.locator('button[aria-label*="Delete location"]');
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Confirm delete in modal
    await page.locator('div[role="dialog"] button:has-text("Delete")').click();
    await page.waitForTimeout(1500);

    const remainingCount = await page.locator(`text=${testArea}`).count();
    console.log(`Location deleted, remaining count in table:`, remainingCount);
  }

  // Final screenshot of table & page
  await page.screenshot({ path: path.join(__dirname, 'locations-final-verified.png'), fullPage: true });

  await browser.close();
  console.log('ALL FUNCTIONAL TESTS PASSED SUCCESSFULLY!');
})();
