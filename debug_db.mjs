import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://azyhppsxmyuawvcmfwmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWhwcHN4bXl1YXd2Y21md21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwODA5NSwiZXhwIjoyMDkzNjg0MDk1fQ.PY0v0maBwKB5TsQYD1UcXV7R0XyndyeIyTIJUTck6eQ'
);

async function debug() {
  console.log("=== DEBUGGING DATABASE RECORDS ===");

  // 1. Fetch clients containing "Luis" or profiles containing "Luis"
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .ilike('full_name', '%Luis%');

  if (clientErr) console.error("Client fetch error:", clientErr);
  console.log("\n--- CLIENTS MATCHING 'Luis' ---");
  console.log(JSON.stringify(clients, null, 2));

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%Luis%');

  if (profileErr) console.error("Profile fetch error:", profileErr);
  console.log("\n--- PROFILES MATCHING 'Luis' ---");
  console.log(JSON.stringify(profiles, null, 2));

  // 2. Fetch appointments for these clients/profiles
  const clientIds = clients ? clients.map(c => c.id) : [];
  const profileIds = profiles ? profiles.map(p => p.id) : [];
  const allIds = [...new Set([...clientIds, ...profileIds])];

  if (allIds.length > 0) {
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('*, services(name), tenant_staff(id)')
      .in('client_id', allIds);

    if (apptErr) console.error("Appointment fetch error:", apptErr);
    console.log("\n--- APPOINTMENTS FOR THESE CLIENTS/PROFILES ---");
    console.log(JSON.stringify(appointments, null, 2));
  } else {
    console.log("\nNo matching client/profile IDs to query appointments.");
  }
}

debug();
