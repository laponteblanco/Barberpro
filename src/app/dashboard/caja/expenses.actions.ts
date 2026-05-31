"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addExpenseAction(formData: FormData) {
  const { tenantId, user } = await getSession();
  if (!tenantId || !user) {
    throw new Error("No autorizado");
  }

  const amountStr = formData.get("amount")?.toString() || "0";
  // Remove non-numeric characters
  const amount = Number(amountStr.replace(/[^0-9]/g, ""));
  const category = formData.get("category")?.toString() || "Otros";
  const description = formData.get("description")?.toString() || "";

  if (amount <= 0) {
    return { error: "El monto debe ser mayor a 0." };
  }

  const adminSupabase = await createAdminClient();

  const { error } = await (adminSupabase as any)
    .from("expenses")
    .insert({
      tenant_id: tenantId,
      category,
      description,
      amount,
      created_by: user.id
    });

  if (error) {
    console.error("Error al registrar gasto:", error);
    // User friendly error if table is missing
    if (error.code === '42P01') {
      return { error: "La tabla de gastos no existe aún. Recuerda ejecutar el script SQL en Supabase." };
    }
    return { error: `Error al registrar el gasto: ${error.message}` };
  }

  revalidatePath("/dashboard/caja");
  return { success: true };
}
