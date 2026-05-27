import { createClient } from '@supabase/supabase-js';

const url = 'https://vsslcbsdvxbsfivcfxfd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk';
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
