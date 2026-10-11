const fs = require('fs');
const path = require('path');

function getLargeFiles(dir, threshold = 400) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        results = results.concat(getLargeFiles(fullPath, threshold));
      }
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      if (lines >= threshold) {
        results.push({ path: path.relative('D:\\clinic-flow-source', fullPath), lines });
      }
    }
  }
  return results;
}

const largeFiles = getLargeFiles('D:\\clinic-flow-source\\src');
largeFiles.sort((a, b) => b.lines - a.lines);
console.log(`Found ${largeFiles.length} files with >= 400 lines:`);
largeFiles.forEach(f => console.log(`${f.lines.toString().padStart(5)} lines: ${f.path}`));
