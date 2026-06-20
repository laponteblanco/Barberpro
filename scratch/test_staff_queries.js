require('dotenv').config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function testStaffPage() {
  console.log("=== RUNNING STAFF PAGE QUERIES ===");
  
  // Test for each tenant
  const tenants = [
    '6ae7ae9c-5696-4cec-a2d6-1978f3820220', // Luis Aponte's tenant
    '753bb522-79ba-4334-b5ea-3b558f109735'  // Duva's tenant
  ];

  for (const tenantId of tenants) {
    console.log(`\n--- Testing for Tenant: ${tenantId} ---`);
    
    // 1. Get staff
    const { data: staff, error: staffError } = await supabase
      .from("tenant_staff")
      .select(`
        *,
        profile:profiles!inner(full_name, avatar_url, id_number)
      `)
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (staffError) {
      console.error("Staff Query Error:", staffError);
    } else {
      console.log(`Staff query succeeded! Found ${staff.length} staff members.`);
      console.log(JSON.stringify(staff, null, 2));
    }

    // 2. Get short_code
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("short_code")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      console.error("Tenant Query Error:", tenantError);
    } else {
      console.log("Tenant short_code query succeeded:", tenant.short_code);
    }
  }
}

testStaffPage();
