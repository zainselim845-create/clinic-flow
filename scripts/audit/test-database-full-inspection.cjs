const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';

console.log('========================================================================');
console.log('🔍 DEEP DATABASE & STORAGE CONNECTIVITY INSPECTION');
console.log(`🎯 Supabase Endpoint: ${SUPABASE_URL}`);
console.log(`🔑 Key Type: Anon/Publishable Key`);
console.log('========================================================================\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectDatabase() {
  const report = {
    connection: null,
    latencyMs: null,
    tables: {},
    crudTest: null,
    storageBuckets: null,
    tenantsRegistryFile: null
  };

  // --- Step 1: Low-level Network & Ping ---
  console.log('--- 1. Network & HTTPS Ping Test ---');
  const pingStart = Date.now();
  try {
    await new Promise((resolve, reject) => {
      const req = https.get(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }, (res) => {
        const pingTime = Date.now() - pingStart;
        report.latencyMs = pingTime;
        console.log(`[✅ PASS] TLS Handshake & REST endpoint response: HTTP ${res.statusCode} (${pingTime}ms)`);
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.setTimeout(8000, () => req.destroy(new Error('Timeout')));
    });
  } catch (err) {
    console.error('[❌ FAIL] Network ping failed:', err.message);
    report.connection = { error: err.message };
  }

  // --- Step 2: Table Inspection & Row Counts ---
  console.log('\n--- 2. Database Tables & Schema Exploration ---');
  const targetTables = [
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
    'journal_entries'
  ];

  for (const table of targetTables) {
    const tStart = Date.now();
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      const elapsed = Date.now() - tStart;
      if (error) {
        report.tables[table] = { status: 'error', code: error.code, message: error.message, elapsedMs: elapsed };
        console.log(`[⚠️ TABLE] ${table.padEnd(20)} -> Error (${error.code || 'unknown'}): ${error.message} (${elapsed}ms)`);
      } else {
        report.tables[table] = { status: 'accessible', count: count || 0, elapsedMs: elapsed };
        console.log(`[✅ TABLE] ${table.padEnd(20)} -> Accessible! Record Count: ${count ?? 0} (${elapsed}ms)`);
      }
    } catch (err) {
      report.tables[table] = { status: 'exception', error: err.message };
      console.log(`[❌ TABLE] ${table.padEnd(20)} -> Exception: ${err.message}`);
    }
  }

  // --- Step 3: CRUD Write & Read Storage on Database ---
  console.log('\n--- 3. Database Write & Storage Test (CRUD) ---');
  const testClinicId = 'audit-test-' + Date.now();
  const testPatient = {
    clinic_id: 'enterprise-clinic1', // Use existing clinic to satisfy foreign key if present
    name: 'فحص تجريبي لقاعدة البيانات ' + Date.now(),
    phone: '01000000000',
    age: 35,
    gender: 'ذكر',
    diagnosis: 'فحص فني للاتصال والقرأة والكتابة'
  };

  try {
    const insertStart = Date.now();
    const { data: inserted, error: insertError } = await supabase
      .from('patients')
      .insert([testPatient])
      .select()
      .single();

    const insertTime = Date.now() - insertStart;

    if (insertError) {
      console.log(`[⚠️ INSERT NOTICE] Insert into patients: ${insertError.message} (Code: ${insertError.code}) (${insertTime}ms)`);
      report.crudTest = { write: 'blocked_by_rls_or_schema', detail: insertError };
    } else {
      console.log(`[✅ INSERT PASS] Record inserted into Supabase DB! ID: ${inserted.id} (${insertTime}ms)`);
      
      // Read back
      const { data: readBack, error: readError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', inserted.id)
        .single();

      if (readError) {
        console.log(`[⚠️ READ NOTICE] Read-back error: ${readError.message}`);
      } else {
        console.log(`[✅ READ PASS] Successfully read back inserted record: "${readBack.name}"`);
      }

      // Cleanup
      const { error: delError } = await supabase
        .from('patients')
        .delete()
        .eq('id', inserted.id);

      if (delError) {
        console.log(`[⚠️ DELETE NOTICE] Cleanup notice: ${delError.message}`);
      } else {
        console.log(`[✅ DELETE PASS] Test record cleaned up successfully from database!`);
      }

      report.crudTest = { write: 'success', read: 'success', delete: 'success' };
    }
  } catch (err) {
    console.log(`[❌ CRUD EXCEPTION]`, err.message);
    report.crudTest = { exception: err.message };
  }

  // --- Step 4: Supabase Object Storage Buckets Inspection ---
  console.log('\n--- 4. Cloud Object Storage (Buckets & Files) Inspection ---');
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.log(`[⚠️ STORAGE] List buckets: ${bucketsError.message}`);
      report.storageBuckets = { error: bucketsError.message };
    } else {
      console.log(`[✅ STORAGE PASS] Supabase Storage connected! Buckets count: ${buckets.length}`);
      buckets.forEach(b => console.log(`   └─ Bucket: "${b.name}" (Public: ${b.public}, Created: ${b.created_at})`));
      report.storageBuckets = buckets;
    }
  } catch (err) {
    console.log(`[⚠️ STORAGE EXCEPTION] ${err.message}`);
    report.storageBuckets = { exception: err.message };
  }

  // --- Step 5: Tenants Registry Cloud File Check ---
  console.log('\n--- 5. Cloud Tenants Registry Public File Check ---');
  const registryUrl = 'https://rogkodgqeowiylpckspi.supabase.co/storage/v1/object/public/tenants/sync/tenants_registry.json';
  try {
    const regStart = Date.now();
    await new Promise((resolve) => {
      https.get(registryUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const regElapsed = Date.now() - regStart;
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(body);
              const clinicsCount = (parsed.tenants || []).length;
              const usersCount = (parsed.users || []).length;
              console.log(`[✅ REGISTRY PASS] tenants_registry.json accessible (HTTP 200, ${regElapsed}ms)`);
              console.log(`   └─ Clinics registered: ${clinicsCount}`);
              console.log(`   └─ Users registered: ${usersCount}`);
              console.log(`   └─ File size: ${(body.length / 1024).toFixed(2)} KB`);
              report.tenantsRegistryFile = { status: 'healthy', clinicsCount, usersCount, bytes: body.length };
            } catch {
              console.log(`[⚠️ REGISTRY] Received HTTP 200 but failed to parse JSON`);
            }
          } else {
            console.log(`[⚠️ REGISTRY] HTTP ${res.statusCode} on tenants_registry.json`);
            report.tenantsRegistryFile = { status: 'non_200', code: res.statusCode };
          }
          resolve();
        });
      }).on('error', (e) => {
        console.log(`[❌ REGISTRY ERROR] ${e.message}`);
        report.tenantsRegistryFile = { error: e.message };
        resolve();
      });
    });
  } catch (err) {
    console.log(`[❌ REGISTRY EXCEPTION] ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log('📊 DATABASE & STORAGE INSPECTION COMPLETE');
  console.log('========================================================================\n');
}

inspectDatabase().catch(console.error);
