import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function getBarberServices() {
  const { tenantId } = await getSession();
  if (!tenantId) return [];

  const adminSupabase = await createAdminClient();
  const { data, error } = await (adminSupabase as any)
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("price", { ascending: false });

  if (error) {
    console.error("Error fetching services:", error);
    return [];
  }
  return data;
}
