import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const shouldStartServer = !process.env.PARITY_AUDIT_URL;
const baseUrl = process.env.PARITY_AUDIT_URL || 'http://127.0.0.1:5173';
const email = process.env.PARITY_AUDIT_EMAIL || 'sherry';
const password = process.env.PARITY_AUDIT_PASSWORD || 'sherry';

const roles = ['superadmin', 'admin', 'subadmin', 'employee'];
const routes = ['followup', 'search-property', 'properties', 'sales', 'crm', 'admins', 'locations', 'map', 'subscription', 'chat'];

async function canReach(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 45000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for audit server at ${url}`);
}

async function startAuditServer() {
  if (!shouldStartServer) {
    await waitForServer(baseUrl, 10000);
    return null;
  }
  if (await canReach(baseUrl)) return null;

  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run dev -- --port 5173']
    : ['run', 'dev', '--', '--port', '5173'];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'ignore',
  });
  await waitForServer(baseUrl);
  return child;
}

async function login(page, role) {
  await page.goto(`${baseUrl}/login/${role}`, { waitUntil: 'domcontentloaded' });
  const inputs = page.locator('input');
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(email);
    await inputs.nth(1).fill(password);
  }
  const signIn = page.getByRole('button', { name: /sign in|login/i }).first();
  if (await signIn.isVisible().catch(() => false)) {
    await signIn.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

async function unlabeledButtons(page) {
  return page.locator('button:visible').evaluateAll((buttons) =>
    buttons
      .map((button, index) => {
        const name = (button.getAttribute('aria-label') || button.textContent || '').trim();
        return name ? null : index + 1;
      })
      .filter(Boolean),
  );
}

const server = await startAuditServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failures = [];

try {
  for (const role of roles) {
    await login(page, role);
    for (const route of routes) {
      const url = `${baseUrl}/${role}/${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((error) => {
        failures.push({ role, route, issue: `navigation failed: ${error.message}` });
      });
      const missingNames = await unlabeledButtons(page).catch((error) => {
        failures.push({ role, route, issue: `button audit failed: ${error.message}` });
        return [];
      });
      if (missingNames.length) {
        failures.push({ role, route, issue: `${missingNames.length} visible button(s) lack text or aria-label` });
      }
    }
  }
} finally {
  await browser.close();
  server?.kill();
}

const result = { status: failures.length ? 'fail' : 'pass', checkedRoles: roles.length, checkedRoutes: routes.length, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
