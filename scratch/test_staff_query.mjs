import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

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
