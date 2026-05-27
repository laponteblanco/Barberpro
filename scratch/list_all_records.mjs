import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';
const supabase = createClient(url, serviceKey);

async function list() {
  console.log("--- TENANTS ---");
  const { data: tenants, error: tErr } = await supabase.from('tenants').select('*');
  if (tErr) console.error(tErr);
  else console.log(JSON.stringify(tenants, null, 2));

  console.log("--- TENANT STAFF ---");
  const { data: staff, error: sErr } = await supabase.from('tenant_staff').select('*');
  if (sErr) console.error(sErr);
  else console.log(JSON.stringify(staff, null, 2));

  console.log("--- PROFILES ---");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error(pErr);
  else console.log(JSON.stringify(profiles, null, 2));
}

list();
