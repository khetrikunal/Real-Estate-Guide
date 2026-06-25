const fs = require('fs');
const path = require('path');

const reactRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(reactRoot, '..');
const apiRoot = path.join(reactRoot, 'src', 'api');
const srcRoot = path.join(reactRoot, 'src');
const backendRoot = path.join(repoRoot, 'backend', 'src', 'main', 'java');

function normalizePath(value) {
  let pathValue = String(value || '')
    .replace(/\$\{[^}]+\}/g, '{id}')
    .replace(/\?.*$/, '')
    .replace(/\/+/g, '/');
  if (!pathValue.startsWith('/')) pathValue = `/${pathValue}`;
  pathValue = pathValue.replace(/^\/api(?=\/|$)/, '');
  if (!pathValue.startsWith('/')) pathValue = `/${pathValue}`;
  return pathValue.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function readQuoted(source, quoteStart) {
  const quote = source[quoteStart];
  let value = '';
  let index = quoteStart + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      value += source.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (quote === '`' && char === '$' && source[index + 1] === '{') {
      value += '{id}';
      index += 2;
      let depth = 1;
      while (index < source.length && depth > 0) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') depth -= 1;
        index += 1;
      }
      continue;
    }
    if (char === quote) return { value, end: index + 1 };
    value += char;
    index += 1;
  }
  throw new Error(`Unterminated string at ${quoteStart}`);
}

function findMatchingParen(source, openIndex) {
  let depth = 0;
  let index = openIndex;
  while (index < source.length) {
    const char = source[index];
    if (['"', "'", '`'].includes(char)) {
      index = readQuoted(source, index).end;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
    index += 1;
  }
  return source.length;
}

function extractCatalog() {
  const catalogPath = path.join(apiRoot, 'endpointCatalog.ts');
  const source = fs.readFileSync(catalogPath, 'utf8');
  const entries = [];
  const entryRegex =
    /\{\s*feature:\s*'([^']+)',\s*name:\s*'([^']+)',\s*method:\s*'([A-Z]+)',\s*path:\s*'([^']+)'\s*\}/g;
  let match;
  while ((match = entryRegex.exec(source))) {
    entries.push({
      feature: match[1],
      name: match[2],
      method: match[3],
      path: normalizePath(match[4]),
    });
  }
  return entries;
}

function extractEstateApiEndpoints() {
  const source = fs.readFileSync(path.join(apiRoot, 'estateApi.ts'), 'utf8');
  const endpoints = [];
  const callRegex = /\b(apiRequest|upload)\s*(?:<[^>]+>)?\s*\(/g;
  let match;
  while ((match = callRegex.exec(source))) {
    const openParen = callRegex.lastIndex - 1;
    let index = callRegex.lastIndex;
    while (/\s/.test(source[index])) index += 1;
    if (!['"', "'", '`'].includes(source[index])) continue;
    const parsed = readQuoted(source, index);
    const callEnd = findMatchingParen(source, openParen);
    const callArguments = source.slice(parsed.end, callEnd);
    const methodMatch = callArguments.match(/method:\s*['"]([A-Z]+)['"]/);
    endpoints.push({
      method: methodMatch ? methodMatch[1] : match[1] === 'upload' ? 'POST' : 'GET',
      path: normalizePath(parsed.value),
    });
  }

  const urlRegex = /=>\s*(`)(\/api[\s\S]*?)`/g;
  while ((match = urlRegex.exec(source))) {
    endpoints.push({ method: 'GET', path: normalizePath(readQuoted(source, match.index + match[0].indexOf('`')).value) });
  }

  return uniqueEndpoints(endpoints);
}

function extractAnnotationPaths(args) {
  if (!args) return [''];
  const paths = [];
  const arrayMatch = args.match(/\{\s*((?:"[^"]*"\s*,?\s*)+)\s*\}/);
  if (arrayMatch) {
    for (const match of arrayMatch[1].matchAll(/"([^"]*)"/g)) {
      paths.push(match[1]);
    }
  }
  const valueMatch = args.match(/(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"/);
  if (valueMatch) paths.push(valueMatch[1]);
  return [...new Set(paths.length ? paths : [''])];
}

function walkFiles(directory, predicate, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, result);
    } else if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function extractBackendEndpoints() {
  const files = walkFiles(backendRoot, (file) => file.endsWith('Controller.java'));
  const endpoints = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const classIndex = source.search(/\bclass\s+\w+/);
    const prefix = classIndex >= 0 ? source.slice(0, classIndex) : source;
    const baseMatch = prefix.match(/@RequestMapping\s*\(([^)]*)\)/s);
    const basePaths = extractAnnotationPaths(baseMatch ? baseMatch[1] : '');
    const body = classIndex >= 0 ? source.slice(classIndex) : source;
    const lines = body.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const annotationMatch = line.match(/@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\s*(?:\((.*)\))?/);
      if (!annotationMatch) continue;

      const methodWindow = lines.slice(index + 1, index + 12).join('\n');
      if (!/\b(public|private|protected)\s+[\w<>?, .\[\]]+\s+\w+\s*\(/.test(methodWindow)) continue;

      const annotation = annotationMatch[1];
      const args = annotationMatch[2] || '';
      const method =
        annotation === 'RequestMapping'
          ? (args.match(/method\s*=\s*RequestMethod\.([A-Z]+)/) || [])[1] || 'ANY'
          : annotation.replace('Mapping', '').toUpperCase();

      for (const basePath of basePaths) {
        for (const routePath of extractAnnotationPaths(args)) {
          endpoints.push({ method, path: normalizePath(`${basePath}/${routePath}`) });
        }
      }
    }
  }
  return uniqueEndpoints(endpoints);
}

function uniqueEndpoints(endpoints) {
  const seen = new Set();
  const result = [];
  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(endpoint);
    }
  }
  return result;
}

function routeMatches(reactEndpoint, backendEndpoint) {
  if (backendEndpoint.method !== 'ANY' && reactEndpoint.method !== backendEndpoint.method) return false;
  const reactSegments = reactEndpoint.path.split('/').filter(Boolean);
  const backendSegments = backendEndpoint.path.split('/').filter(Boolean);
  if (reactSegments.length !== backendSegments.length) return false;
  return reactSegments.every((segment, index) => {
    const other = backendSegments[index];
    return segment === other || /^\{[^}]+\}$/.test(segment) || /^\{[^}]+\}$/.test(other);
  });
}

function endpointKey(endpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function findAdHocFetches() {
  const files = walkFiles(srcRoot, (file) => /\.(ts|tsx)$/.test(file) && !file.includes(`${path.sep}api${path.sep}`));
  const hits = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\bfetch\s*\(/.test(source)) {
      hits.push(path.relative(reactRoot, file).replace(/\\/g, '/'));
    }
  }
  return hits;
}

const catalog = extractCatalog();
const estateApiEndpoints = extractEstateApiEndpoints();
const backendEndpoints = extractBackendEndpoints();

const missingFromCatalog = estateApiEndpoints.filter(
  (endpoint) => !catalog.some((catalogEndpoint) => routeMatches(endpoint, catalogEndpoint)),
);
const missingBackendRoutes = catalog.filter(
  (endpoint) => !backendEndpoints.some((backendEndpoint) => routeMatches(endpoint, backendEndpoint)),
);
const adHocFetches = findAdHocFetches();

if (missingFromCatalog.length || missingBackendRoutes.length || adHocFetches.length) {
  console.error('API contract check failed.');
  if (missingFromCatalog.length) {
    console.error('\nReact estateApi endpoints missing from endpointCatalog.ts:');
    missingFromCatalog.map(endpointKey).sort().forEach((item) => console.error(`- ${item}`));
  }
  if (missingBackendRoutes.length) {
    console.error('\nCatalog endpoints missing matching backend controller mapping:');
    missingBackendRoutes.map(endpointKey).sort().forEach((item) => console.error(`- ${item}`));
  }
  if (adHocFetches.length) {
    console.error('\nAd hoc fetch calls outside src/api:');
    adHocFetches.sort().forEach((item) => console.error(`- ${item}`));
  }
  process.exit(1);
}

console.log(`API contract check passed: ${catalog.length} catalog endpoints, ${backendEndpoints.length} backend routes.`);
