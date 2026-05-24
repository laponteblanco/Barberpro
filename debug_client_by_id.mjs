import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';

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
