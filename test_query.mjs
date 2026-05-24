import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

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
