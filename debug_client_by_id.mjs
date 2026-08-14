import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

const targetId = "c4a486ae-0eeb-4e83-b87d-9d00c9226482";

async function check() {
  console.log("=== CHECKING TARGET CLIENT BY ID ===");
  
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching client:", error);
  } else {
    console.log("Client record:", JSON.stringify(client, null, 2));
  }

  const { data: profile, error2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (error2) {
    console.error("Error fetching profile:", error2);
  } else {
    console.log("Profile record:", JSON.stringify(profile, null, 2));
  }
}

check();
