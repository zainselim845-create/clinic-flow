const fs = require('fs');
const path = require('path');

function getStats(dir) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(getStats(p));
    } else if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.ts')) {
      const lines = fs.readFileSync(p, 'utf8').split('\n').length;
      files.push({ file: path.relative(path.resolve(__dirname, '../../src'), p), lines });
    }
  });
  return files;
}

const stats = getStats(path.resolve(__dirname, '../../src'));
stats.sort((a, b) => b.lines - a.lines);
console.log('Total files in src/:', stats.length);
console.log('\nTop 25 largest files in src/:');
stats.slice(0, 25).forEach((s, i) => {
  console.log(`${String(i + 1).padStart(2, ' ')}. ${s.file.padEnd(55)} -> ${s.lines} lines`);
});

const over400 = stats.filter(s => s.lines > 400);
console.log(`\nFiles over 400 lines: ${over400.length} of ${stats.length}`);
