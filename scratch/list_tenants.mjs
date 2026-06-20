import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

async function list() {
  console.log("--- TENANTS ---");
  const { data: tenants, error: tErr } = await supabase.from('tenants').select('id, name, slug, short_code, is_active');
  if (tErr) console.error(tErr);
  else console.log(JSON.stringify(tenants, null, 2));
}

list();
