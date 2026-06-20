import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("=== RUNNING DATABASE VINCULATION UPDATE ===");
  
  // Link e0cdfbdb-7ff0-4822-ba3d-9d413783a00a (clients.id) to 52857467-33e3-4621-8f5d-752ccdb36ff2 (profiles.id)
  const { data, error } = await supabase
    .from('clients')
    .update({ user_id: '52857467-33e3-4621-8f5d-752ccdb36ff2' })
    .eq('id', 'e0cdfbdb-7ff0-4822-ba3d-9d413783a00a')
    .select();

  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update succeeded:", JSON.stringify(data, null, 2));
  }
}

run();
