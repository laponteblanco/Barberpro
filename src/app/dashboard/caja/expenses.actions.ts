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
  const amount = Number(amountStr.replace(/[^0-9]/g, ""));
  const category = formData.get("category")?.toString() || "Otros";
  const description = formData.get("description")?.toString() || "";
  const paymentMethod = formData.get("payment_method")?.toString() || "cash";

  // Validate payment_method value
  const validPaymentMethods = ["cash", "digital"];
  const resolvedMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "cash";

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
      payment_method: resolvedMethod,
      created_by: user.id,
    });

  if (error) {
    console.error("Error al registrar gasto:", error);
    if (error.code === "42P01") {
      return {
        error:
          "La tabla de gastos no existe aún. Recuerda ejecutar el script SQL 032 en Supabase.",
      };
    }
    return { error: `Error al registrar el gasto: ${error.message}` };
  }

  revalidatePath("/dashboard/caja");
  return { success: true };
}
