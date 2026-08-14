import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function getStaff() {
  const { user, tenantId } = await getSession();
  if (!user || !tenantId) return [];

  const adminSupabase = await createAdminClient();

  const { data, error } = await (adminSupabase as any)
    .from("tenant_staff")
    .select(`
      *,
      profile:profiles!inner(full_name, avatar_url, id_number)
    `)
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) {
    console.error("--- ERROR EN STAFF ---");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code);
    console.error("Detalles:", error.details);
    return [];
  }

  return data;
}

export async function updateStaffStatus(id: string, isActive: boolean) {
  const { supabase } = await getSession();
  const { error } = await (supabase as any)
    .from("tenant_staff")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}
