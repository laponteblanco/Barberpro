import { createAdminClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { withTimeout } from "@/lib/performance";

export async function getCachedTenantData(slug: string) {
  const fetchTenant = unstable_cache(
    async () => {
      const adminSupabase = await createAdminClient();
      const { data: tenant, error } = await withTimeout(
        (adminSupabase as any)
          .from("tenants")
          .select("*, services(*), tenant_staff(*, profiles(*))")
          .eq("slug", slug)
          .eq("is_active", true)
          .single(),
        8000,
        `Fetch Tenant ${slug}`
      );

      if (error || !tenant) {
        console.error(`[Cache] Error fetching tenant data for slug ${slug}:`, error);
        return null;
      }
      return tenant;
    },
    [`tenant-data-${slug}`],
    {
      revalidate: 3600, // Revalidate every hour just as a fallback
      tags: [`tenant-${slug}`, "tenant-data"],
    }
  );

  return fetchTenant();
}
