import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function getProducts() {
  const { tenantId } = await getSession();
  if (!tenantId) return [];

  const adminSupabase = await createAdminClient();
  const { data, error } = await (adminSupabase as any)
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data;
}

export async function getDailySales(date?: Date) {
  const { tenantId } = await getSession();
  if (!tenantId) return [];

  const adminSupabase = await createAdminClient();
  
  // Bogota day range
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate.getTime() - (5 * 3600000));
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Convert back to UTC for query
  const utcStart = new Date(startOfDay.getTime() + (5 * 3600000));
  const utcEnd = new Date(endOfDay.getTime() + (5 * 3600000));

  const { data, error } = await (adminSupabase as any)
    .from("product_sales")
    .select("*, product:products(name)")
    .eq("tenant_id", tenantId)
    .gte("created_at", utcStart.toISOString())
    .lte("created_at", utcEnd.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === 'PGRST204' || error.code === '42P01') {
       return [];
    }
    console.error("Error fetching sales:", error);
    return [];
  }
  return data;
}

