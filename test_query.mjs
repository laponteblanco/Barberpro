import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function test() {
  console.log("=== TESTING APPOINTMENTS QUERY STAFF STRUCTURE ===");
  
  const { data, error } = await supabase
    .from("appointments")
    .select("*, client:clients(*), service:services(*), staff:tenant_staff(*, profiles(*))")
    .limit(3);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Results count:", data ? data.length : 0);
    if (data && data.length > 0) {
      console.log("First appointment staff:", JSON.stringify(data[0].staff, null, 2));
    }
  }
}

test();
