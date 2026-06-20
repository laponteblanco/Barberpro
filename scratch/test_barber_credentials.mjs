import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(url, serviceKey);

async function testBarber(shopCode, pin) {
  try {
    console.log(`=== TESTING BARBER PIN CREDENTIALS for ${shopCode} & ${pin} ===`);

    // 1. Buscar el tenant por el código corto
    const { data: tenant, error: tenantError } = await adminSupabase
      .from("tenants")
      .select("id")
      .eq("short_code", shopCode)
      .single();

    if (tenantError || !tenant) {
      console.error("1. Tenant Query Failed:", tenantError);
      return;
    }
    console.log("1. Tenant Found ID:", tenant.id);

    // 2. Buscar al staff por PIN dentro de ese tenant
    // Let's test with the exact select statement first:
    const { data: staff, error: staffError } = await adminSupabase
      .from("tenant_staff")
      .select("*, profile:profiles(id_number)")
      .eq("tenant_id", tenant.id)
      .eq("access_pin", pin)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError) {
      console.error("2. Staff Query Errored:", staffError);
      return;
    }
    
    if (!staff) {
      console.log("2. Staff NOT found. Let's try searching without PIN to inspect existing PINs...");
      const { data: allStaff } = await adminSupabase
        .from("tenant_staff")
        .select("*")
        .eq("tenant_id", tenant.id);
      console.log("All staff members for this tenant:", JSON.stringify(allStaff, null, 2));
      return;
    }
    
    console.log("2. Staff Found:", JSON.stringify(staff, null, 2));
    
    const cedula = staff.profile?.id_number;
    console.log("3. Extracted id_number (cedula):", cedula);
  } catch (error) {
    console.error("Internal Error:", error);
  }
}

testBarber("MOON-OV", "826346");
