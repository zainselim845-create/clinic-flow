const https = require('https');

const SUPABASE_URL = 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';

function fetchOpenApi() {
  const url = new URL('/rest/v1/?apikey=' + SUPABASE_ANON_KEY, SUPABASE_URL);
  
  const req = https.request(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Response Body: ${data}`);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
  });

  req.end();
}

fetchOpenApi();
