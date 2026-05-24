const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixPermissions() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env variables.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error listing users:", userError);
    process.exit(1);
  }

  const targetUser = users.find(u => u.email === "luisaponteblanco@gmail.com") || users[0];
  
  if (!targetUser) {
    console.log("No user found.");
    process.exit(0);
  }

  console.log(`Fixing permissions for: ${targetUser.email}`);

  // 1. Profile
  await supabase.from('profiles').upsert({
    id: targetUser.id,
    full_name: targetUser.user_metadata?.full_name || "Admin User",
  });

  // 2. Tenant
  let { data: tenant } = await supabase.from('tenants').select('*').limit(1).maybeSingle();
  if (!tenant) {
    console.log("Creating first tenant...");
    const { data: newTenant } = await supabase.from('tenants').insert({
      name: "Barbería Principal",
      slug: "main-shop",
      is_active: true
    }).select().single();
    tenant = newTenant;
  }

  // 3. Staff - owner role
  console.log(`Setting owner role for user ${targetUser.id} in tenant ${tenant.id}`);
  const { error: staffError } = await supabase.from('tenant_staff').upsert({
    tenant_id: tenant.id,
    user_id: targetUser.id,
    display_name: targetUser.user_metadata?.full_name || "Owner",
    role: "owner",
    is_active: true
  }, { onConflict: 'tenant_id,user_id' });

  if (staffError) {
    console.error("Error:", staffError);
  } else {
    console.log("SUCCESS: User is now the owner and has all permissions.");
  }
}

fixPermissions();
