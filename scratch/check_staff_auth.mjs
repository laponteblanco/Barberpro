import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

async function check() {
  const { data: staff, error: sErr } = await supabase.from('tenant_staff').select('*, profiles(id_number, full_name)');
  if (sErr) {
    console.error(sErr);
    return;
  }

  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error(uErr);
    return;
  }

  console.log(`Found ${staff.length} staff members and ${users.length} auth users.`);

  for (const member of staff) {
    const email = `${member.profiles?.id_number}@barberos.app`;
    const userExists = users.find(u => u.email === email);
    console.log(`Staff: ${member.profiles?.full_name} (${member.profiles?.id_number}) -> Email: ${email} -> Auth User Exists: ${!!userExists}`);
  }
}

check();
