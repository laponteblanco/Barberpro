"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACTIVE_TENANT_COOKIE = "x-active-tenant";

/**
 * Get all tenants the current user belongs to (as staff).
 * Used by the TenantSwitcher component.
 */
export async function getUserTenants() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const adminSupabase = await createAdminClient();
  const { data } = await (adminSupabase as any)
    .from("tenant_staff")
    .select("tenant_id, role, tenant:tenants(id, name, slug, logo_url)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (data ?? []).map((s: any) => ({
    id: s.tenant?.id,
    name: s.tenant?.name,
    slug: s.tenant?.slug,
    logo_url: s.tenant?.logo_url,
    role: s.role,
  }));
}

/**
 * Switch the active tenant for the current user.
 * Validates that the user actually belongs to the target tenant.
 */
export async function switchTenant(tenantId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Validate membership
  const adminSupabase = await createAdminClient();
  const { data: staff } = await (adminSupabase as any)
    .from("tenant_staff")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) return;

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  redirect("/dashboard/appointments");
}
