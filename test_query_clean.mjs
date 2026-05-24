import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsvfvcfxfd.supabase.co'; // Wait, let's copy actual URL
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

const supabase = createClient('https://vsslcbsdvxbsfivcfxfd.supabase.co', serviceKey);

async function test() {
  console.log("=== TESTING APPOINTMENTS QUERY WITHOUT DELETED FILTER ===");
  
  const clientId = "c4a486ae-0eeb-4e83-b87d-9d00c9226482";
  const userId = "46fe687f-39cc-45ed-8f22-b562af8f11a0";

  const { data: orData, error: orErr } = await supabase
    .from("appointments")
    .select("*, service:services(*), staff:tenant_staff(*, profiles(*))")
    .or(`client_id.eq.${clientId},client_id.eq.${userId}`)
    .order("start_time", { ascending: false });

  if (orErr) console.error("OR Query Error:", orErr);
  console.log("OR Query Results count:", orData ? orData.length : 0);
  if (orData) console.log("OR Data:", JSON.stringify(orData, null, 2));
}

test();
