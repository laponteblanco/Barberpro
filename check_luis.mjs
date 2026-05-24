import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://azyhppsxmyuawvcmfwmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eWhwcHN4bXl1YXd2Y21md21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwODA5NSwiZXhwIjoyMDkzNjg0MDk1fQ.PY0v0maBwKB5TsQYD1UcXV7R0XyndyeIyTIJUTck6eQ'
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
