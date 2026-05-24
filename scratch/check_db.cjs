const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSession() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === "luisaponteblanco@gmail.com");
  
  if (!user) {
    console.log("User not found");
    return;
  }

  console.log("User ID:", user.id);

  const { data: staff, error } = await supabase
    .from('tenant_staff')
    .select('*, tenant:tenants(*)')
    .eq('user_id', user.id);

  console.log("Staff Records:", JSON.stringify(staff, null, 2));
  if (error) console.error("Error:", error);
}

checkSession();
