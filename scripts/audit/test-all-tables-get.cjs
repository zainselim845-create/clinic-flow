const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'clinics',
  'patients',
  'appointments',
  'invoices',
  'expenses',
  'inventory_items',
  'attendance_logs',
  'system_settings',
  'profiles',
  'patient_wallet',
  'journal_entries',
  'two_factor_credentials'
];

async function checkAllTables() {
  console.log('Testing GET queries on all tables in Supabase:');
  console.log('----------------------------------------------------');
  for (const table of tables) {
    const start = Date.now();
    const { data, error, status } = await supabase.from(table).select('*').limit(1);
    const ms = Date.now() - start;
    if (error) {
      console.log(`[❌ ${table.padEnd(24)}] HTTP ${status} | Error: ${error.code} - ${error.message} (${ms}ms)`);
    } else {
      console.log(`[✅ ${table.padEnd(24)}] HTTP ${status} | Table EXISTS! Rows returned: ${(data || []).length} (${ms}ms)`);
    }
  }
}

checkAllTables().catch(console.error);
