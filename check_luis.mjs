import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vsslcbsdvxbsfivcfxfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk'
);

async function check() {
  console.log("=== CHECKING LUIS RECORDS ===");
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id_number', '12345');

  if (error) {
    console.error("Error fetching clients:", error);
  } else {
    console.log("Clients:", JSON.stringify(clients, null, 2));
  }

  const { data: profiles, error2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', '12345');

  if (error2) {
    console.error("Error fetching profiles:", error2);
  } else {
    console.log("Profiles:", JSON.stringify(profiles, null, 2));
  }

  const { data: appointments, error3 } = await supabase
    .from('appointments')
    .select('*')
    .eq('tenant_id', 'c88f1146-24e5-42bd-9ca7-009772ee83c4');

  if (error3) {
    console.error("Error fetching appointments:", error3);
  } else {
    console.log("Appointments:", JSON.stringify(appointments, null, 2));
  }
}

check();
