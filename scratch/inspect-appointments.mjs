import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function inspect() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: appts, error } = await supabase
    .from("appointments")
    .select(`
      *,
      client:client_id(full_name),
      staff:staff_id(profiles(full_name)),
      service:service_id(name, duration_minutes)
    `)
    .in("id", [
      "43daa9f4-b171-45db-b058-70fbd1bc0f23", // Juan Gomez
      "42935f38-297f-4bdb-90e2-fbb701461359", // Fernando Rey
      "c5d3f9ea-d3c7-4888-87f0-d5e5954d7103", // Lenny Lopez
      "578fa05a-f649-4298-8bf7-04d0dc0a87dc"  // Luis Aponte
    ]);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Detailed inspect:", JSON.stringify(appts, null, 2));
}

inspect();
