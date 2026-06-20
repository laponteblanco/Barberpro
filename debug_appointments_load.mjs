import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(supabaseUrl, serviceKey);

async function simulateLoad() {
  console.log("=== SIMULATING DASHBOARD APPOINTMENTS LOAD FOR 1072714771 ===");

  // 1. Fetch the user profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', '1072714771')
    .single();

  const userId = profile.id;
  console.log("User ID:", userId);

  // 2. Simulate getSession()
  console.time("getSession()");
  const [staffRes, fallbackRes] = await Promise.all([
    supabase
      .from("tenant_staff")
      .select("*, tenant:tenants(id, name, slug, logo_url, settings)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select("id, name, slug, logo_url, settings")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);
  console.timeEnd("getSession()");

  const staffData = staffRes.data?.[0];
  const tenantId = staffData.tenant_id;
  const isBarber = staffData.role === "barber";
  console.log("Tenant ID:", tenantId);
  console.log("Role:", staffData.role);

  // 3. Simulate Appointments page Promise.all
  const selectedDate = '2026-06-20';
  const fetchStart = new Date(`${selectedDate}T00:00:00Z`);
  fetchStart.setHours(fetchStart.getHours() - 6);
  const fetchEnd = new Date(fetchStart);
  fetchEnd.setDate(fetchEnd.getDate() + 7); // Barber 7 days

  console.time("AppointmentsPage queries");
  const [ {data: appointmentsRaw}, {data: clients}, {data: staffRaw}, {data: services}, {data: blocksRaw} ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, client:clients(*), staff:tenant_staff(*, profiles(*)), appointment_services(services(*))")
      .eq("tenant_id", tenantId)
      .match(isBarber ? { staff_id: staffData.id } : {})
      .gte("start_time", fetchStart.toISOString())
      .lte("start_time", fetchEnd.toISOString())
      .neq("status", "cancelled"),
    supabase.from("clients").select("id, full_name, id_number").eq("tenant_id", tenantId).order("full_name"),
    supabase
      .from("tenant_staff")
      .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, working_hours, profile:profiles(full_name, avatar_url)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("role", "barber")
      .match(isBarber ? { id: staffData.id } : {}),
    supabase.from("services").select("id, name, price, duration_minutes").eq("tenant_id", tenantId).eq("is_active", true).order("price", { ascending: false }),
    supabase
      .from("agenda_blocks")
      .select("*")
      .eq("tenant_id", tenantId)
      .match(isBarber ? { staff_id: staffData.id } : {})
      .gte("start_time", fetchStart.toISOString())
      .lte("start_time", fetchEnd.toISOString())
  ]);
  console.timeEnd("AppointmentsPage queries");

  console.log(`Loaded ${appointmentsRaw?.length} appointments.`);
  console.log(`Loaded ${clients?.length} clients.`);
  console.log(`Loaded ${staffRaw?.length} staff.`);
  console.log(`Loaded ${services?.length} services.`);
  console.log(`Loaded ${blocksRaw?.length} blocks.`);
}

simulateLoad();
