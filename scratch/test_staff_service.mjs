import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';
const supabase = createClient(url, serviceKey);

async function test() {
  console.log("--- TESTING QUERY WITH PROFILE:PROFILES!INNER ---");
  const tenantId = "c6469c0a-054d-4d84-bdff-839498dac32c";
  
  const { data, error } = await supabase
    .from("tenant_staff")
    .select(`
      *,
      profile:profiles!inner(full_name, avatar_url, id_number)
    `)
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) {
    console.error("--- ERROR EN STAFF ---");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code);
    console.error("Detalles:", error.details);
  } else {
    console.log(`Success! Found ${data.length} staff members.`);
    console.log(JSON.stringify(data, null, 2));
  }
}

test();
