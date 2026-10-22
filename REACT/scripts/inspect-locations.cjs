const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5174/superadmin/locations...');
  await page.goto('http://127.0.0.1:5174/superadmin/locations', { waitUntil: 'networkidle' });

  console.log('Current URL:', page.url());

  // If redirected to /roles or login, click superadmin role
  if (page.url().includes('/roles') || page.url().includes('/login')) {
    console.log('Redirected to login/roles. Logging in as superadmin...');
    // Look for superadmin role card or button
    const superAdminBtn = page.locator('text=Super Admin, text=SuperAdmin, [data-role="superadmin"]').first();
    if (await superAdminBtn.count() > 0) {
      await superAdminBtn.click();
      await page.waitForTimeout(1000);
    }
    // Check if we need to enter credentials or if login page appeared
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill('super@sherry.com');
      const passInput = page.locator('input[type="password"]');
      if (await passInput.count() > 0) {
        await passInput.fill('sherry');
      }
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.goto('http://127.0.0.1:5174/superadmin/locations', { waitUntil: 'networkidle' });
  }

  console.log('Final URL:', page.url());
  await page.screenshot({ path: path.join(__dirname, 'locations-initial.png'), fullPage: true });

  // Check if "Add Location" button is present and click it
  const addBtn = page.locator('button:has-text("Add Location")');
  console.log('Add Location button count:', await addBtn.count());
  if (await addBtn.count() > 0) {
    await addBtn.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'locations-dialog-open.png'), fullPage: true });

    const dialogInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No dialog found' };
      
      const input = dialog.querySelector('input');
      const select = dialog.querySelector('[data-slot="select-trigger"], [role="combobox"]');
      const label = dialog.querySelector('label');
      const title = dialog.querySelector('h2, [data-slot="dialog-title"]');

      function getRules(el) {
        if (!el) return [];
        const result = [];
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.selectorText && el.matches(rule.selectorText)) {
                result.push({
                  selector: rule.selectorText,
                  css: rule.cssText,
                });
              }
            }
          } catch (e) {}
        }
        return result;
      }

      return {
        inputRules: getRules(input),
        selectRules: getRules(select),
        labelRules: getRules(label),
        titleRules: getRules(title),
      };
    });

    console.log('Matched Rules:', JSON.stringify(dialogInfo, null, 2));
  }

  await browser.close();
  console.log('Done inspection!');
})();
