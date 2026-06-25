const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.REFERENCE_BASE_URL || 'http://127.0.0.1:5173';
const outDir = path.resolve(__dirname, '..', 'screenshots', 'reference-ui-routes');

const routes = [
  ['followup', '/superadmin/followup'],
  ['search-property', '/superadmin/search-property'],
  ['properties', '/superadmin/properties'],
  ['add-project', '/superadmin/properties/new'],
  ['sales', '/superadmin/sales'],
  ['admins', '/superadmin/admins'],
  ['locations', '/superadmin/locations'],
  ['crm', '/superadmin/crm'],
  ['map', '/superadmin/map'],
  ['chat', '/superadmin/chat'],
  ['subscription', '/superadmin/subscription'],
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  for (const [name, route] of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}.animate-in-up,.animate-in-fade,.text-reveal{opacity:1!important;clip-path:none!important;transform:none!important;filter:none!important}',
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      fullPage: true,
    });
  }

  await browser.close();
  console.log(`Captured ${routes.length} reference route screenshots in ${path.relative(process.cwd(), outDir)}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
