/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from "@/lib/supabase/session";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * getAppointments — supports two call patterns:
 * 1. From pages: getAppointments() — uses cached session
 * 2. From API routes: getAppointments(tenantId, filters) — uses direct client
 */
export async function getAppointments(
  tenantIdArg?: string,
  filters?: { from?: string; to?: string; staffId?: string; status?: string }
) {
  let supabase: any;
  let tenantId: string | null;

  if (tenantIdArg && filters !== undefined) {
    // Called from API route
    supabase = await createClient();
    tenantId = tenantIdArg;
  } else {
    // Called from page — use cached session and admin client to bypass join RLS
    const session = await getSession();
    if (!session.user || !session.tenantId) return [];
    supabase = await createAdminClient();
    tenantId = session.tenantId;
  }

  if (!tenantId) return [];

  let query = supabase
    .from("appointments")
    .select(`
      *,
      client:client_id (id, full_name, phone),
      staff:staff_id (id, profiles (full_name)),
      service:service_id (id, name, duration_minutes, price)
    `)
    .eq("tenant_id", tenantId)
    .order("start_time", { ascending: true });

  if (filters?.from) query = query.gte("start_time", filters.from);
  if (filters?.to) query = query.lte("start_time", filters.to);
  if (filters?.staffId) query = query.eq("staff_id", filters.staffId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;

  if (error) {
    console.error("--- ERROR CRÍTICO EN CITAS ---");
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    console.error("Detalles:", error.details);
    console.error("JSON Error:", JSON.stringify(error));
    return [];
  }

  return data as any[];
}

/**
 * createAppointment — supports two call patterns:
 * 1. From pages/actions: createAppointment(formData)
 * 2. From API routes: createAppointment(tenantId, body)
 */
export async function createAppointment(tenantIdOrData: any, body?: any) {
  let supabase: any;
  let insertData: any;

  if (body !== undefined) {
    // Called from API route: createAppointment(tenantId, body)
    supabase = await createClient();
    insertData = { ...body, tenant_id: tenantIdOrData };
  } else {
    // Called from page/action: createAppointment(formData)
    const session = await getSession();
    if (!session.user) throw new Error("No authenticated user");
    supabase = session.supabase;
    insertData = tenantIdOrData;
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
}
