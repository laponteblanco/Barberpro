"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClientAction(data: { full_name: string; id_number: string; phone: string; email?: string; notes?: string; birth_date?: string }) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No session" };

  const adminSupabase = await createAdminClient();

  const { data: newClient, error } = await (adminSupabase as any)
    .from("clients")
    .insert([{ 
      ...data, 
      tenant_id: tenantId 
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating client:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/appointments");
  return { success: true, client: newClient };
}

export async function updateClientAction(clientId: string, data: { full_name: string; id_number: string; phone: string; email?: string; notes?: string; birth_date?: string }) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No session" };

  const adminSupabase = await createAdminClient();

  const { error } = await (adminSupabase as any)
    .from("clients")
    .update(data)
    .eq("id", clientId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error updating client:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}
