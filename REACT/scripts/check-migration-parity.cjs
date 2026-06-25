const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const reactRoot = path.resolve(__dirname, '..');
const matrixPath = path.join(repoRoot, '.planning', 'react-migration', 'parity-matrix.json');
const estateApiPath = path.join(reactRoot, 'src', 'api', 'estateApi.ts');
const sourceRoot = path.join(reactRoot, 'src');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'target', 'dist', 'build', '.git', '.code-review-graph'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, predicate, out);
    else if (predicate(fullPath)) out.push(fullPath);
  }
  return out;
}

function extractRoutes() {
  const sourceFiles = walk(sourceRoot, (filePath) => /\.(tsx|jsx)$/.test(filePath));
  const routes = new Set();
  for (const filePath of sourceFiles) {
    const source = readText(filePath);
    for (const match of source.matchAll(/<Route\s+path="([^"]+)"/g)) {
      routes.add(match[1]);
      routes.add(normalizeRoute(match[1]));
    }
  }
  return routes;
}

function normalizeRoute(route) {
  if (!route) return route;
  const cleaned = route.replace(/\/+$/, '') || '/';
  if (cleaned === '/:role' || cleaned.startsWith('/:role/')) return cleaned;
  return cleaned.replace(/^\/(superadmin|admin|subadmin|employee)(?=\/|$)/, '/:role');
}

function extractApiEndpoints(source) {
  return new Set(
    [...source.matchAll(/(?:apiRequest|apiBlob|upload)(?:<[^>]+>)?\(`([^`]+)`|(?:apiRequest|apiBlob|upload)(?:<[^>]+>)?\('([^']+)'/g)]
      .map((match) => match[1] || match[2] || match[3] || match[4])
      .filter(Boolean)
      .map((endpoint) => endpoint.replace(/\$\{[^}]+\}/g, '{id}')),
  );
}

function extractBackendControllers() {
  const controllerRoot = path.join(repoRoot, 'backend', 'src', 'main', 'java');
  const files = walk(controllerRoot, (filePath) => filePath.endsWith('.java'));
  return files
    .map((filePath) => {
      const source = readText(filePath);
      if (!/@RestController|@Controller/.test(source)) return null;
      const className = path.basename(filePath, '.java');
      const mappingCount = (source.match(/@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\b/g) || [])
        .length;
      return {
        controller: className,
        file: path.relative(repoRoot, filePath).split(path.sep).join('/'),
        mappingCount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.controller.localeCompare(b.controller));
}

function main() {
  const matrix = JSON.parse(readText(matrixPath));
  const routes = extractRoutes();
  const apiEndpoints = extractApiEndpoints(readText(estateApiPath));
  const controllers = extractBackendControllers();

  const entries = matrix.flutterPages || [];
  const missingDisposition = entries.filter((entry) => !entry.disposition);
  const missingRoutes = entries.filter((entry) => {
    if (!entry.reactRoute || entry.disposition === 'merged' || entry.disposition === 'intentionally_retired') return false;
    return !routes.has(entry.reactRoute) && !routes.has(normalizeRoute(entry.reactRoute));
  });
  const missingApi = entries.flatMap((entry) =>
    (entry.requiredApi || [])
      .filter((endpoint) => !apiEndpoints.has(endpoint) && !apiEndpoints.has(endpoint.replace(/\{[^}]+\}/g, '{id}')))
      .map((endpoint) => ({ flutterPage: entry.flutterPage, endpoint })),
  );

  const result = {
    status: missingDisposition.length || missingRoutes.length || missingApi.length ? 'fail' : 'pass',
    flutterPageCount: entries.length,
    expectedFlutterPageCount: matrix.expectedFlutterPageCount,
    missingDisposition,
    missingRoutes,
    missingApi,
    backendControllerCount: controllers.length,
    backendMappingCount: controllers.reduce((sum, controller) => sum + controller.mappingCount, 0),
    reactRouteCount: routes.size,
    reactApiEndpointCount: apiEndpoints.size,
  };

  console.log(JSON.stringify(result, null, 2));

  if (entries.length !== matrix.expectedFlutterPageCount || result.status !== 'pass') {
    process.exitCode = 1;
  }
}

main();
