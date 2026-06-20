import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

async function check() {
  const tenantId = '84d8a0ff-6fba-4001-b853-91b439cb9b36'; // Mi Barbería Principal
  
  const { data, error } = await supabase
    .from("tenant_staff")
    .select(`
      *,
      profile:profiles(full_name, avatar_url, id_number)
    `)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${data.length} staff members for Mi Barbería Principal:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
