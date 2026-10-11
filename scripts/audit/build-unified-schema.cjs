const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
const migrationFiles = [
  '001_initial_schema.sql',
  '002_expenses_and_recalls.sql',
  '003_multi_tenant_core.sql',
  '004_super_admin_and_quotas.sql',
  '005_million_user_scale_and_scoping.sql',
  '006_better_auth_and_organizations.sql',
  '20260929_strict_rls_policies.sql',
  '20261001_two_factor_vault.sql'
];

let unifiedSql = `-- ========================================================================
-- CLINICFLOW ENTERPRISE DATABASE SCHEMA (UNIFIED PRODUCTION ROLLOUT)
-- Project: https://rogkodgqeowiylpckspi.supabase.co
-- Generated automatically for one-click execution in Supabase SQL Editor.
-- ========================================================================

-- Enable core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

migrationFiles.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    unifiedSql += `\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
    unifiedSql += `-- Migration File: ${file}\n`;
    unifiedSql += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n`;
    unifiedSql += content + '\n\n';
  }
});

// Add schema reload notify at the end to reload PostgREST cache immediately
unifiedSql += `
-- ========================================================================
-- RELOAD POSTGREST SCHEMA CACHE
-- ========================================================================
NOTIFY pgrst, 'reload schema';
`;

const outputPath = path.resolve(__dirname, '../../supabase/COMPLETE_PRODUCTION_DATABASE_SCHEMA.sql');
fs.writeFileSync(outputPath, unifiedSql, 'utf8');

console.log('Successfully generated unified schema file:');
console.log('Path:', outputPath);
console.log('Total characters:', unifiedSql.length);
console.log('Total lines:', unifiedSql.split('\n').length);
