import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const cedula = '1072714771';
  console.log(`=== CHECKING USER RECORDS FOR ${cedula} ===`);

  // 1. Get profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', cedula)
    .maybeSingle();

  if (profErr) {
    console.error("Error fetching profiles:", profErr);
    return;
  }
  console.log("Profile found:", JSON.stringify(profile, null, 2));

  if (!profile) {
    console.log("No profile found with id_number:", cedula);
    return;
  }

  // 1.5 Get auth user
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(profile.id);
  if (authErr) {
    console.error("Error fetching auth user:", authErr);
  } else {
    console.log("Auth User Metadata:", JSON.stringify(authUser.user?.user_metadata, null, 2));
    console.log("Auth User Email:", authUser.user?.email);
  }

  // 2. Get tenant_staff records for this user
  const { data: staff, error: staffErr } = await supabase
    .from('tenant_staff')
    .select('*, tenant:tenants(*)')
    .eq('user_id', profile.id);

  if (staffErr) {
    console.error("Error fetching tenant_staff:", staffErr);
  } else {
    console.log("Tenant staff links found:", JSON.stringify(staff, null, 2));
  }
}

check();
