import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

async function list() {
  console.log("--- TENANTS ---");
  const { data: tenants, error: tErr } = await supabase.from('tenants').select('*');
  if (tErr) console.error(tErr);
  else console.log(JSON.stringify(tenants, null, 2));

  console.log("--- TENANT STAFF ---");
  const { data: staff, error: sErr } = await supabase.from('tenant_staff').select('*');
  if (sErr) console.error(sErr);
  else console.log(JSON.stringify(staff, null, 2));

  console.log("--- PROFILES ---");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error(pErr);
  else console.log(JSON.stringify(profiles, null, 2));
}

list();
