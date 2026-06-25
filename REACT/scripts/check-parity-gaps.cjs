const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const matrixPath = path.join(repoRoot, '.planning', 'react-migration', 'parity-matrix.json');

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const entries = matrix.flutterPages || [];
const gaps = entries.filter((entry) => entry.disposition === 'gap');

const result = {
  status: gaps.length ? 'fail' : 'pass',
  gapCount: gaps.length,
  gaps: gaps.map((entry) => ({
    flutterPage: entry.flutterPage,
    reactRoute: entry.reactRoute,
    reactComponent: entry.reactComponent,
    gap: entry.gap,
  })),
};

console.log(JSON.stringify(result, null, 2));

if (gaps.length) {
  process.exitCode = 1;
}
