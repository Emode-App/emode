const fs = require('fs');

async function run() {
  const query = fs.readFileSync('packages/database/migrations/20260317_rls_policies.sql', 'utf8');
  
  const token = 'sbp_b5c81995d9c9f2740edac007edf4b8ee13e14149';
  const ref = 'nmqsjfghiunjghaoranw';

  // The actual endpoint is not documented to be POST /database/query in all versions, let's try it
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

  console.log('Running query against', endpoint);
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

run().catch(console.error);
