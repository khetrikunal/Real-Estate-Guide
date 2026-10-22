const { chromium } = require('playwright');

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

  const elements = await page.evaluate(() => {
    function info(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        text: el.innerText,
        color: window.getComputedStyle(el).color,
        bg: window.getComputedStyle(el).backgroundColor,
      };
    }

    return {
      title: info('h1'),
      desc: info('.reference-body-copy'),
      statLabel: info('.reference-stat-card .eyebrow'),
      statValue: info('.reference-stat-card .font-mono'),
      statHint: info('.reference-stat-card .text-muted-foreground'),
      searchPlaceholder: info('.reference-section input'),
      recordsBadge: info('.reference-section span.tabular-nums'),
      tableTh: info('th'),
      tableTdHierarchy: info('td:nth-child(1)'),
      tableTdState: info('td:nth-child(2)'),
      tableTdCity: info('td:nth-child(3)'),
      tableTdArea: info('td:nth-child(4)'),
      tableTdPrice: info('td:nth-child(5)'),
      tableTdActions: info('td:nth-child(6)'),
      detailHierarchy: info('.reference-section:last-of-type div span:nth-child(2)'),
    };
  });

  console.log(JSON.stringify(elements, null, 2));
  await browser.close();
})();
