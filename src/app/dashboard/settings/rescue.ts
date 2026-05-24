"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateShortCode } from "@/lib/utils";

export async function promoteToAdminAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  // 2. Check if already has a tenant_staff record
  const { data: existing } = await supabase
    .from("tenant_staff")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return;

  // 3. Create a default tenant for this user (using Admin Client with casting to avoid 'never')
  const { data: tenant, error: tenantError } = await adminSupabase
    .from("tenants")
    .insert({
      name: "Mi Barbería Principal",
      slug: `shop-${user.id.slice(0, 5)}`,
      short_code: generateShortCode("SHOP"),
      is_active: true
    } as any)
    .select()
    .single();

  if (tenantError) throw new Error(`Error creando barbería: ${tenantError.message}`);

  const tenantData = tenant as any;

  // 4. Assign as Admin (using Admin Client with casting to avoid 'never')
  const { error: staffError } = await adminSupabase
    .from("tenant_staff")
    .insert({
      tenant_id: tenantData.id,
      user_id: user.id,
      display_name: user.user_metadata?.full_name || "Administrador",
      role: 'admin',
      is_active: true
    } as any);

  if (staffError) throw new Error(`Error asignando permisos: ${staffError.message}`);

  revalidatePath("/dashboard");
}
