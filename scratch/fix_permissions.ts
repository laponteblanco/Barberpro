import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixPermissions() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env variables.");
    return;
  }
  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

  // Find the user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Error listing users:", userError);
    return;
  }

  const targetUser = users.find(u => u.email === "luisaponteblanco@gmail.com") || users[0];

  if (!targetUser) {
    console.log("No user found to fix.");
    return;
  }

  console.log(`Fixing permissions for: ${targetUser.email} (${targetUser.id})`);

  // 1. Check if user has a profile
  const { data: profile } = await supabase.from("profiles" as any).select("*").eq("id", targetUser.id).maybeSingle();
  if (!profile) {
    console.log("Creating missing profile...");
    await supabase.from("profiles" as any).insert({
      id: targetUser.id,
      full_name: targetUser.user_metadata?.full_name || "Admin User",
    } as any);
  }

  // 2. Find or create tenant
  let { data: tenant } = await supabase.from("tenants" as any).select("*").limit(1).maybeSingle();
  if (!tenant) {
    console.log("Creating first tenant...");
    const { data: newTenant, error: tErr } = await supabase.from("tenants" as any).insert({
      name: "Barbería Principal",
      slug: "main-shop",
      is_active: true
    } as any).select().single();
    if (tErr) console.error("Error creating tenant:", tErr);
    tenant = newTenant;
  }

  // 3. Upsert tenant_staff record as admin
  console.log(`Ensuring admin role in tenant: ${tenant?.id}`);
  const { error: staffError } = await supabase.from("tenant_staff" as any).upsert({
    user_id: targetUser.id,
    tenant_id: tenant?.id,
    display_name: targetUser.user_metadata?.full_name || "Admin",
    role: "admin",
    is_active: true
  } as any, { onConflict: 'user_id' });

  if (staffError) {
    console.error("Error updating staff role:", staffError);
  } else {
    console.log("SUCCESS: User is now an admin.");
  }
}

fixPermissions();
