import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
