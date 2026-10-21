const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '../../.env.vercel.prod'), 'utf8');
    const match = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\r\n]+)"?/);
    if (match) serviceKey = match[1];
  } catch (e) {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_SERVICE_KEY = serviceKey || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';
const BUCKET_NAME = 'tenants';
const REGISTRY_FILE = 'sync/tenants_registry.json';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanRegistry() {
  console.log('Downloading live registry from Supabase Storage...');
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(REGISTRY_FILE);

  if (error || !data) {
    console.error('Download error:', error);
    return;
  }

  const text = await data.text();
  const parsed = JSON.parse(text);

  console.log('Original registry users count:', parsed.users?.length);
  console.log('Checking for passwords in users...');
  
  // Scrub passwords
  let strippedCount = 0;
  if (Array.isArray(parsed.users)) {
    parsed.users = parsed.users.map(u => {
      if (u.password || u.doctorPassword) {
        strippedCount++;
        const { password, doctorPassword, ...safe } = u;
        return safe;
      }
      return u;
    });
  }

  if (Array.isArray(parsed.tenants)) {
    parsed.tenants = parsed.tenants.map(t => {
      if (t.doctorPassword || t.apiKey || t.secretKey) {
        strippedCount++;
        const { doctorPassword, apiKey, secretKey, secret, ...safe } = t;
        return safe;
      }
      return t;
    });
  }

  console.log(`Stripped sensitive credentials from ${strippedCount} records.`);

  parsed.updatedAt = new Date().toISOString();
  const cleanBuffer = Buffer.from(JSON.stringify(parsed, null, 2));

  console.log('Uploading sanitized registry to Supabase Storage...');
  const uploadRes = await supabase.storage
    .from(BUCKET_NAME)
    .upload(REGISTRY_FILE, cleanBuffer, {
      contentType: 'application/json',
      upsert: true
    });

  if (uploadRes.error) {
    console.error('Upload failed:', uploadRes.error);
  } else {
    console.log('✅ Sanitized registry successfully updated on Supabase!');
  }
}

cleanRegistry();
