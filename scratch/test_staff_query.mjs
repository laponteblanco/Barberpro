import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function test() {
  console.log("=== TESTING STAFF QUERY ===");
  const { data, error } = await supabase
    .from("tenant_staff")
    .select("id, role, commission_rate, daily_commission_rates, compensation_type, rent_amount, profiles(full_name, avatar_url)");

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Results:", JSON.stringify(data, null, 2));
  }
}

test();
