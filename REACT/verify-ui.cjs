const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5175';
  const outDir = path.resolve('artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const checks = [];
  for (const cfg of [
    { name: 'desktop-light', width: 1440, height: 980, dark: false },
    { name: 'desktop-dark', width: 1440, height: 980, dark: true },
    { name: 'mobile-light', width: 390, height: 1000, dark: false }
  ]) {
    const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height } });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForURL(/\/roles$/, { timeout: 10000 });
    await page.getByRole('button', { name: /Super Admin/ }).click();
    await page.waitForURL(/\/login\/superadmin$/, { timeout: 10000 });
    await page.locator('input').nth(0).fill('super@sherry.com');
    await page.locator('input').nth(1).fill(process.env.VERIFY_SUPERADMIN_PASSWORD || 'sherry');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForFunction(() => window.location.pathname === '/superadmin', null, { timeout: 45000 });
    await page.locator('a[href="/superadmin/followup"]').click();
    await page.waitForFunction(() => window.location.pathname === '/superadmin/followup', null, { timeout: 15000 });
    if (cfg.dark) await page.getByText('Theme').click();
    const screenshot = path.join(outDir, `${cfg.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const data = await page.evaluate(() => {
      const body = document.body.getBoundingClientRect();
      const overflowing = [...document.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 2 || r.left < -2);
      }).slice(0, 8).map((el) => `${el.tagName}.${el.className}`);
      return {
        title: document.querySelector('h2')?.textContent,
        navButtons: [...document.querySelectorAll('.nav-item')].map((el) => el.textContent.trim()).filter(Boolean),
        hasCoverageRoute: Boolean(document.querySelector('a[href="/superadmin/add-property"]')),
        hasLoginStorage: Boolean(localStorage.getItem('estate.portal.authToken')),
        selectedRole: localStorage.getItem('estate.portal.activeRole'),
        bodyWidth: Math.round(body.width),
        viewportWidth: window.innerWidth,
        overflowing,
      };
    });
    checks.push({ ...cfg, screenshot, ...data });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(checks, null, 2));
})();
