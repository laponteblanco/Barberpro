import { createAdminClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { withTimeout } from "@/lib/performance";

export async function getCachedTenantData(slug: string) {
  const decoded = decodeURIComponent(slug).trim();
  const normalizedSlug = decoded
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const spaceVersion = normalizedSlug.replace(/-/g, " ");

  const fetchTenant = unstable_cache(
    async () => {
      const adminSupabase = await createAdminClient();

      // Query database with OR conditions to match various slug formats (trailing space, hyphens, spaces, etc.)
      const { data: tenants, error } = (await withTimeout(
        (adminSupabase as any)
          .from("tenants")
          .select("*, services(*), tenant_staff(*, profiles(*))")
          .eq("is_active", true)
          .or(`slug.eq.${normalizedSlug},slug.ilike.${spaceVersion},slug.ilike.${spaceVersion}%,slug.ilike.${normalizedSlug}%,slug.eq.${decoded}`)
          .limit(1),
        8000,
        `Fetch Tenant ${normalizedSlug}`
      )) as any;

      if (error) {
        console.error(`[Cache] Error fetching tenant data for slug ${slug}:`, error);
        return null;
      }

      if (!tenants || tenants.length === 0) {
        console.error(`[Cache] No tenant found matching slug "${slug}" (normalized: "${normalizedSlug}")`);
        return null;
      }

      return tenants[0];
    },
    [`tenant-data-${normalizedSlug}`],
    {
      revalidate: 3600, // Revalidate every hour just as a fallback
      tags: [`tenant-${normalizedSlug}`, "tenant-data"],
    }
  );

  return fetchTenant();
}
