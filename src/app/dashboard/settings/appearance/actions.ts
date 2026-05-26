"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { revalidatePath } from "next/cache";

export async function updateThemeAction(theme: "dark" | "light") {
  const { tenantId, user: currentUser } = await getSession();
  if (!tenantId || !currentUser) {
    throw new Error("No autorizado");
  }

  const adminSupabase = await createAdminClient();

  // First fetch current settings
  const { data: tenant, error: fetchError } = await (adminSupabase as any)
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (fetchError) {
    throw new Error(`Error al obtener configuraciones: ${fetchError.message}`);
  }

  const currentSettings = tenant.settings || {};
  const newSettings = { ...currentSettings, theme };

  const { error: updateError } = await (adminSupabase as any)
    .from("tenants")
    .update({ settings: newSettings })
    .eq("id", tenantId);

  if (updateError) {
    throw new Error(`Error al actualizar el tema: ${updateError.message}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}
