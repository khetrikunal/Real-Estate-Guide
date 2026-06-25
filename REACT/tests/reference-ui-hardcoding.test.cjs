const { spawnSync } = require('child_process');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, ['scripts/check-reference-ui-hardcoding.cjs'], {
  cwd: repo,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status);
}

process.stdout.write(result.stdout);
