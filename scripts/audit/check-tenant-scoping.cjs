const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, '../../src/services');
const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts'));

const findings = [];

serviceFiles.forEach(file => {
  const filePath = path.join(servicesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Find all occurrences of supabase.from(
  lines.forEach((line, index) => {
    if (line.includes('supabase.from(') || line.includes("supabase\n  .from(")) {
      // Look backward 15 lines and forward 20 lines to see the query and payload chain
      const startIdx = Math.max(0, index - 15);
      const endIdx = Math.min(lines.length, index + 20);
      const chunk = lines.slice(startIdx, endIdx).join('\n');
      const tableMatch = line.match(/supabase\.from\(['"]([^'"]+)['"]\)/);
      const tableName = tableMatch ? tableMatch[1] : 'unknown';

      // Check if chunk scopes by clinic_id or id or tenant
      const hasClinicScope = chunk.includes('clinic_id') || 
                             chunk.includes('clinicId') || 
                             chunk.includes('tenantId') ||
                             chunk.includes('.eq(\'id\'') ||
                             chunk.includes('.eq("id"');
      
      // Known global tables that don't have clinic_id
      const isGlobalTable = ['system_settings', 'tenants', 'clinics', 'profiles', 'plans', 'platform_audit_logs'].includes(tableName);

      if (!hasClinicScope && !isGlobalTable) {
        findings.push({
          file,
          line: index + 1,
          table: tableName,
          snippet: chunk.split('\n').slice(0, 5).join(' ')
        });
      }
    }
  });
});

console.log('Total service files scanned:', serviceFiles.length);
console.log('Potential unscoped queries found:', findings.length);
if (findings.length > 0) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  console.log('SUCCESS: All database queries in src/services/ are strictly tenant-scoped or global!');
}
