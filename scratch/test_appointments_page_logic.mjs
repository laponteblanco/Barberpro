import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(url, serviceKey);

async function testPerformance(tenantId, isBarber, staffId) {
  console.log(`\n=== TESTING PERFORMANCE FOR Tenant: ${tenantId}, isBarber: ${isBarber} ===`);
  
  const selectedDate = '2026-05-26';
  
  const fetchStart = new Date(`${selectedDate}T00:00:00Z`);
  fetchStart.setTime(fetchStart.getTime() + (5 * 3600000));
  fetchStart.setHours(fetchStart.getHours() - 6);

  const fetchEnd = new Date(fetchStart);
  if (isBarber) {
    fetchEnd.setDate(fetchEnd.getDate() + 7);
  } else {
    fetchEnd.setHours(fetchEnd.getHours() + 36);
  }

  // Measure Appointments Query
  console.time("1. Appointments Query");
  const { data: appointmentsRaw, error: apptError } = await supabase
    .from("appointments")
    .select("*, client:clients(*), service:services(*), staff:tenant_staff(*, profiles(*))")
    .eq("tenant_id", tenantId)
    .match(isBarber ? { staff_id: staffId } : {})
    .gte("start_time", fetchStart.toISOString())
    .lte("start_time", fetchEnd.toISOString())
    .neq("status", "cancelled");
  console.timeEnd("1. Appointments Query");
  if (apptError) console.error("   Error:", apptError);
  else console.log(`   Fetched ${appointmentsRaw?.length || 0} appointments.`);

  // Measure Clients Query
  console.time("2. Clients Query");
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, full_name, id_number")
    .eq("tenant_id", tenantId)
    .order("full_name");
  console.timeEnd("2. Clients Query");
  if (clientsError) console.error("   Error:", clientsError);
  else console.log(`   Fetched ${clients?.length || 0} clients.`);

  // Measure Staff Query
  console.time("3. Staff Query");
  const { data: staffRaw, error: staffError } = await supabase
    .from("tenant_staff")
    .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, profiles(full_name, avatar_url)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .match(isBarber ? { id: staffId } : {});
  console.timeEnd("3. Staff Query");
  if (staffError) console.error("   Error:", staffError);
  else console.log(`   Fetched ${staffRaw?.length || 0} staff members.`);

  // Measure Services Query
  console.time("4. Services Query");
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");
  console.timeEnd("4. Services Query");
  if (servicesError) console.error("   Error:", servicesError);
  else console.log(`   Fetched ${services?.length || 0} services.`);

  // Measure Tenant Query
  console.time("5. Tenant Query");
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  console.timeEnd("5. Tenant Query");
  if (tenantError) console.error("   Error:", tenantError);
  else console.log("   Fetched tenant settings.");
}

async function run() {
  // Test as Admin on Mi Barbería Principal
  await testPerformance('84d8a0ff-6fba-4001-b853-91b439cb9b36', false, null);
  
  // Test as Barber on MOON CITY BARBER (Duva Smith)
  await testPerformance('c6469c0a-054d-4d84-bdff-839498dac32c', true, '88c9ac22-4c13-4522-9385-77e99b1b6ae6');
}

run();
