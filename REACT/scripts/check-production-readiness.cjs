const fs = require('fs');
const path = require('path');

const reactRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(reactRoot, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

const checks = [
  {
    name: 'web API defaults to same-origin /api',
    pass: () => /return\s+'\/api'/.test(read('REACT/src/config/env.ts')),
  },
  {
    name: 'native API uses encrypted remote backend URLs',
    pass: () => {
      const source = read('REACT/src/config/env.ts');
      return /https:\/\/realestate-guide\.in\/api/.test(source) &&
        /wss:\/\/realestate-guide\.in\/ws/.test(source) &&
        !/http:\/\/43\.205\.232\.94\/api/.test(source) &&
        !/ws:\/\/43\.205\.232\.94\/ws/.test(source) &&
        source.includes('assertEncryptedProductionUrl');
    },
  },
  {
    name: 'Vite dev and preview proxy API and websocket paths',
    pass: () => {
      const source = read('REACT/vite.config.ts');
      return source.includes("'/api'") && source.includes("'/ws'") && /preview:\s*{[\s\S]*proxy/.test(source);
    },
  },
  {
    name: 'Capacitor serves the Vite production dist directory',
    pass: () => /webDir:\s*'dist'/.test(read('REACT/capacitor.config.ts')),
  },
  {
    name: 'SPA hosting fallback is copied from public',
    pass: () => exists('REACT/public/_redirects') && read('REACT/public/_redirects').includes('/* /index.html 200'),
  },
  {
    name: 'payment and subscription endpoints are represented in React API',
    pass: () => {
      const source = read('REACT/src/api/estateApi.ts');
      return [
        '/payment/create-order',
        '/payment/verify',
        '/payment/renew',
        '/payment/renew/verify',
        '/subscription/subscribe',
        '/subscription/status/${userId}',
        '/subscription/${userId}',
        '/payment/by-subadmin/${id}',
      ].every((needle) => source.includes(needle));
    },
  },
  {
    name: 'backend permits public payment recovery endpoints',
    pass: () => {
      const source = read('backend/src/main/java/com/real_estate/Kunal/Config/SecurityConfig.java');
      return [
        '/api/payment/create-order',
        '/api/payment/verify',
        '/api/payment/renew',
        '/api/payment/renew/verify',
        '/api/payments/verify-and-complete',
        '/api/payments/mark-failed',
      ].every((needle) => source.includes(needle));
    },
  },
  {
    name: 'backend CORS allows production domain and local preview origins',
    pass: () => {
      const source = read('backend/src/main/java/com/real_estate/Kunal/Config/CorsConfig.java');
      return source.includes('https://realestate-guide.in') &&
        source.includes('http://localhost:[*]') &&
        source.includes('Access-Control-Allow-Origin');
    },
  },
  {
    name: 'CSP assumption documented for Razorpay checkout',
    pass: () => {
      const source = read('REACT/PRODUCTION_READINESS.md');
      return source.includes('checkout.razorpay.com') && source.includes('Content-Security-Policy');
    },
  },
];

const failures = [];

for (const check of checks) {
  let ok = false;
  try {
    ok = Boolean(check.pass());
  } catch (error) {
    ok = false;
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${check.name}`);
  if (!ok) failures.push(check.name);
}

if (failures.length) {
  console.error(`Production readiness check failed: ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log(`Production readiness check passed: ${checks.length} checks.`);
}
