import "server-only";
import { cache } from "react";
import { createClient, createAdminClient } from "./server";

/**
 * Cached session helper — deduplicates auth + tenant lookups
 * within a single request lifecycle using React.cache().
 */
export const getSession = cache(async () => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) return { user: null, staff: null, tenantId: null, supabase };

  const adminSupabase = await createAdminClient();
  
  // Try to find staff/tenant link and the first tenant in parallel
  const [staffRes, fallbackRes] = await Promise.all([
    adminSupabase
      .from("tenant_staff" as any)
      .select("*, tenant:tenants(id, name, slug, logo_url)" as any)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from("tenants")
      .select("id, name, slug, logo_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  if (staffRes.data) {
    const staffData = staffRes.data as any;
    return {
      user,
      staff: staffData,
      tenantId: staffData.tenant_id,
      supabase,
    };
  }

  // Fallback para administradores sin vínculo explícito en tenant_staff
  const isAdmin = user.user_metadata?.role === "admin" || user.user_metadata?.role === "superadmin";
  const tenantData = fallbackRes.data as any;

  if (isAdmin && tenantData) {
    return {
      user,
      staff: { tenant: tenantData, role: 'admin' } as any,
      tenantId: tenantData.id,
      supabase,
    };
  }

  return {
    user,
    staff: null,
    tenantId: null,
    supabase,
  };
});
