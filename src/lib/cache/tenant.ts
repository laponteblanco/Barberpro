import { createAdminClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { withTimeout } from "@/lib/performance";

/**
 * Normalize a raw URL slug:
 * - decode percent-encoding (%20 → space, etc.)
 * - trim whitespace
 * - lowercase
 * - replace spaces / underscores with hyphens
 * - strip any characters that aren't alphanumeric or hyphens
 */
function normalizeSlug(raw: string): string {
  try {
    const decoded = decodeURIComponent(raw);
    return decoded
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  } catch {
    return raw.toLowerCase().trim();
  }
}

export async function getCachedTenantData(slug: string) {
  // Always work with a clean slug so URL variants like "DISTRITO%20BARBER"
  // and "distrito-barber" resolve to the same tenant.
  const normalizedSlug = normalizeSlug(slug);

  const fetchTenant = unstable_cache(
    async () => {
      const adminSupabase = await createAdminClient();

      // 1. Try exact match with the normalized slug
      const { data: tenant, error } = (await withTimeout(
        (adminSupabase as any)
          .from("tenants")
          .select("*, services(*), tenant_staff(*, profiles(*))")
          .eq("slug", normalizedSlug)
          .eq("is_active", true)
          .single(),
        8000,
        `Fetch Tenant ${normalizedSlug}`
      )) as any;

      if (!error && tenant) return tenant;

      // 2. Fallback: case-insensitive ILIKE search so slugs stored with
      //    wrong casing (e.g. "DISTRITO BARBER") are still found.
      const { data: tenantFallback, error: fallbackError } = (await withTimeout(
        (adminSupabase as any)
          .from("tenants")
          .select("*, services(*), tenant_staff(*, profiles(*))")
          .ilike("slug", normalizedSlug)
          .eq("is_active", true)
          .limit(1),
        8000,
        `Fetch Tenant fallback ${normalizedSlug}`
      )) as any;

      if (!fallbackError && tenantFallback && tenantFallback.length > 0) {
        return tenantFallback[0];
      }

      console.error(
        `[Cache] Tenant not found for slug "${slug}" (normalized: "${normalizedSlug}"):`,
        error
      );
      return null;
    },
    [`tenant-data-${normalizedSlug}`],
    {
      revalidate: 3600,
      tags: [`tenant-${normalizedSlug}`, "tenant-data"],
    }
  );

  return fetchTenant();
}
