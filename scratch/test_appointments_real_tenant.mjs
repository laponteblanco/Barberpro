import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';
const supabase = createClient(url, serviceKey);

const tenantId = 'c6469c0a-054d-4d84-bdff-839498dac32c'; // MOON CITY BARBER

async function testQueries() {
  console.log("=== RUNNING REAL TENANT APPOINTMENTS PAGE QUERIES ===");

  const fetchStart = new Date("2026-05-24T00:00:00Z");
  const fetchEnd = new Date("2026-06-02T12:00:00Z");

  console.log("1. Fetching appointments...");
  const apptRes = await supabase
    .from("appointments")
    .select("*, client:clients(*), service:services(*), staff:tenant_staff(*, profiles(*))")
    .eq("tenant_id", tenantId)
    .gte("start_time", fetchStart.toISOString())
    .lte("start_time", fetchEnd.toISOString())
    .neq("status", "cancelled");
  
  if (apptRes.error) {
    console.error("Appointments Query Error:", apptRes.error);
  } else {
    console.log("Appointments success, count:", apptRes.data.length);
  }

  console.log("2. Fetching clients...");
  const clientsRes = await supabase
    .from("clients")
    .select("id, full_name, id_number")
    .eq("tenant_id", tenantId)
    .order("full_name");
  
  if (clientsRes.error) {
    console.error("Clients Query Error:", clientsRes.error);
  } else {
    console.log("Clients success, count:", clientsRes.data.length);
  }

  console.log("3. Fetching tenant_staff...");
  const staffRes = await supabase
    .from("tenant_staff")
    .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, profiles(full_name, avatar_url)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  
  if (staffRes.error) {
    console.error("Staff Query Error:", staffRes.error);
  } else {
    console.log("Staff success, count:", staffRes.data.length);
  }
}

testQueries();
