import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient(url, serviceKey);

async function check() {
  console.log("=== CHECKING ACTUAL DATABASE RECORDS ===");
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id_number', '12345');

  if (error) {
    console.error("Error fetching clients:", error);
  } else {
    console.log("Clients matching 12345:", JSON.stringify(clients, null, 2));
  }

  const { data: profiles, error2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', '12345');

  if (error2) {
    console.error("Error fetching profiles:", error2);
  } else {
    console.log("Profiles matching 12345:", JSON.stringify(profiles, null, 2));
  }

  const { data: appointments, error3 } = await supabase
    .from('appointments')
    .select('*');

  if (error3) {
    console.error("Error fetching appointments:", error3);
  } else {
    console.log("Total appointments in DB:", appointments ? appointments.length : 0);
    console.log("Appointments:", JSON.stringify(appointments, null, 2));
  }
}

check();
