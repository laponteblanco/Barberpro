import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(url, serviceKey);

async function inspect() {
  console.log("=== INSPECTING DATABASE STATE ===");

  // 1. Tenants
  const { data: tenants, error: tenantsErr } = await supabase.from('tenants').select('*');
  console.log("\n--- TENANTS ---");
  if (tenantsErr) console.error(tenantsErr);
  else console.log(JSON.stringify(tenants, null, 2));

  // 2. Profiles
  const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('*');
  console.log("\n--- PROFILES ---");
  if (profilesErr) console.error(profilesErr);
  else console.log(JSON.stringify(profiles, null, 2));

  // 3. Tenant Staff
  const { data: staff, error: staffErr } = await supabase.from('tenant_staff').select('*');
  console.log("\n--- TENANT STAFF ---");
  if (staffErr) console.error(staffErr);
  else console.log(JSON.stringify(staff, null, 2));
}

inspect();
