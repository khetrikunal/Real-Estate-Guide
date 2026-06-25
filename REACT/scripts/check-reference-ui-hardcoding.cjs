const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src', 'v0');
const scannedRoots = [
  path.join(root, 'app', '[role]'),
  path.join(root, 'components', 'shell'),
  path.join(root, 'components', 'property'),
  path.join(root, 'components', 'effects'),
  path.join(root, 'components', 'ui', 'reference-button.tsx'),
  path.join(root, 'components', 'ui', 'reference-card.tsx'),
  path.join(root, 'components', 'ui', 'reference-empty-state.tsx'),
  path.join(root, 'components', 'ui', 'reference-table.tsx'),
].map((file) => path.normalize(file));
const allowed = new Set(
  [
    path.join(root, 'design', 'reference-ui.ts'),
    path.join(root, 'components', 'effects', 'DarkVeil.tsx'),
    path.join(root, 'components', 'effects', 'DarkVeil.css'),
    path.join(root, 'components', 'effects', 'ReferenceVeil.tsx'),
    path.join(root, 'components', 'effects', 'AuthenticatedBackground.css'),
  ].map((file) => path.normalize(file)),
);

const forbiddenPatterns = [
  { name: 'hex color', rx: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgb color', rx: /\brgba?\(/ },
  { name: 'hsl color', rx: /\bhsla?\(/ },
  {
    name: 'tailwind literal color utility',
    rx: /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
  },
  { name: 'hardcoded gradient', rx: /\bbg-gradient-to-[a-z]+\b/ },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file, out);
    } else if (/\.(tsx|ts|css)$/.test(entry.name)) {
      out.push(path.normalize(file));
    }
  }
  return out;
}

const failures = [];
function isScanned(file) {
  return scannedRoots.some((scanRoot) => file === scanRoot || file.startsWith(`${scanRoot}${path.sep}`));
}

for (const file of walk(root)) {
  if (!isScanned(file)) continue;
  if (allowed.has(file)) continue;

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    for (const pattern of forbiddenPatterns) {
      if (pattern.rx.test(line)) {
        failures.push(`${path.relative(process.cwd(), file)}:${index + 1} ${pattern.name}: ${trimmed}`);
      }
    }
  });
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Reference UI hardcoding scan passed');
