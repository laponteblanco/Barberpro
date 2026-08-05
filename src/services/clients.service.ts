/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from "@/lib/supabase/session";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * getClients — used by both the page (no args) and the API route (with tenantId + options).
 * Overloaded: when called from a page, it uses the cached session.
 * When called from the API route, it uses the provided tenantId directly.
 */
export async function getClients(
  tenantIdOrSearch?: string,
  options?: { search?: string; limit?: number; offset?: number }
) {
  let supabase: any;
  let tenantId: string | null;
  let searchTerm: string | undefined;

  if (options !== undefined) {
    // Called from API route: getClients(tenantId, { search, limit, offset })
    supabase = await createClient();
    tenantId = tenantIdOrSearch ?? null;
    searchTerm = options.search;
  } else {
    // Called from page — use cached session and admin client to bypass RLS
    const session = await getSession();
    if (!session.user || !session.tenantId) return [];
    supabase = await createAdminClient();
    tenantId = session.tenantId;
    searchTerm = tenantIdOrSearch;
  }

  if (!tenantId) return [];

  let query = supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true });

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  return data;
}

export async function createClient2(tenantId: string, body: any) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("clients")
    .insert([{ ...body, tenant_id: tenantId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
