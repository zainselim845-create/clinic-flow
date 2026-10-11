const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, '../../src/services');
const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts'));

const findings = [];

serviceFiles.forEach(file => {
  const filePath = path.join(servicesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let inLoop = false;
  let loopStartLine = 0;
  let loopType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check loop starts
    if (/\bfor\s*\([^)]+\)/.test(line) || 
        /\bfor\s+await\b/.test(line) ||
        /\.forEach\s*\(\s*async/.test(line) ||
        /\.map\s*\(\s*async/.test(line)) {
      inLoop = true;
      loopStartLine = i + 1;
      loopType = line.trim();
    }

    // Check if loop contains supabase or fetch inside it
    if (inLoop) {
      if (line.includes('supabase.from(') || (line.includes('await') && (line.includes('fetch(') || line.includes('get') || line.includes('insert(') || line.includes('update(')))) {
        // If it's a supabase call inside a loop
        if (line.includes('supabase.from(')) {
          findings.push({
            file,
            loopStartLine,
            loopType,
            queryLine: i + 1,
            code: line.trim()
          });
        }
      }

      // Simple loop close detection
      if (line.includes('}') && (line.includes(';') || line.trim() === '}' || line.includes(')'))) {
        // reset if looks like end of block
        if (i - loopStartLine > 25) {
          inLoop = false;
        }
      }
    }
  }
});

console.log('Total services checked for N+1 queries:', serviceFiles.length);
console.log('N+1 loop candidates found:', findings.length);
if (findings.length > 0) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  console.log('SUCCESS: Zero N+1 query loops detected across all services!');
}
