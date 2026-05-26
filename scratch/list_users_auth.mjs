import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(url, serviceKey);

async function listUsers() {
  console.log("=== USERS IN AUTH ===");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
    return;
  }
  
  for (const user of users) {
    console.log(`- ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Metadata: ${JSON.stringify(user.user_metadata)}`);
    console.log(`  Created At: ${user.created_at}`);
  }

  console.log("\n=== TENANT STAFF ===");
  const { data: staff, error: staffErr } = await supabase.from('tenant_staff').select('*, tenant:tenants(*)');
  if (staffErr) {
    console.error("Error listing tenant_staff:", staffErr);
  } else {
    console.log(JSON.stringify(staff, null, 2));
  }

  console.log("\n=== TENANTS ===");
  const { data: tenants, error: tenantsErr } = await supabase.from('tenants').select('*');
  if (tenantsErr) {
    console.error("Error listing tenants:", tenantsErr);
  } else {
    console.log(JSON.stringify(tenants, null, 2));
  }
}

listUsers();
