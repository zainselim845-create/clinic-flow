const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(getFiles(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = getFiles(path.resolve(__dirname, '../../src'));
const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.\.?\/[^'"]+)['"]/g;

const graph = {};

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  graph[f] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rel = match[1];
    const dir = path.dirname(f);
    let resolved = path.resolve(dir, rel);
    const exts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
    let found = null;
    for (const ext of exts) {
      if (fs.existsSync(resolved + ext) && !fs.statSync(resolved + ext).isDirectory()) {
        found = resolved + ext;
        break;
      }
    }
    if (found && allFiles.includes(found)) {
      graph[f].push(found);
    }
  }
});

const visited = {};
const recStack = {};
const cycles = [];

function checkCycle(node, pathStack = []) {
  visited[node] = true;
  recStack[node] = true;
  pathStack.push(node);

  for (const neighbor of graph[node] || []) {
    if (!visited[neighbor]) {
      checkCycle(neighbor, [...pathStack]);
    } else if (recStack[neighbor]) {
      const cycleStartIdx = pathStack.indexOf(neighbor);
      if (cycleStartIdx !== -1) {
        cycles.push([...pathStack.slice(cycleStartIdx), neighbor].map(p => path.relative(path.resolve(__dirname, '../..'), p)));
      }
    }
  }

  recStack[node] = false;
}

Object.keys(graph).forEach(node => {
  if (!visited[node]) {
    checkCycle(node);
  }
});

console.log('Total files scanned in src/:', allFiles.length);
console.log('Circular dependency cycles found:', cycles.length);
if (cycles.length > 0) {
  cycles.slice(0, 10).forEach((c, i) => console.log(`Cycle #${i+1}: ${c.join(' -> ')}`));
} else {
  console.log('SUCCESS: Zero circular dependencies detected in src/!');
}
