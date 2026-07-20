"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getActiveProductsForExpensesAction() {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { error: "No autorizado" };

    const adminSupabase = await createAdminClient();
    const { data, error } = await (adminSupabase as any)
      .from("products")
      .select("id, name, stock, cost_price, retail_price")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .gt("stock", 0)
      .order("name");

    if (error) throw error;
    return { data };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function addExpenseAction(formData: FormData) {
  const { tenantId, user } = await getSession();
  if (!tenantId || !user) {
    throw new Error("No autorizado");
  }

  const amountStr = formData.get("amount")?.toString() || "0";
  // Permitimos 0 si el usuario solo quiere descontar inventario sin gastar dinero real
  const amount = Number(amountStr.replace(/[^0-9]/g, ""));
  const category = formData.get("category")?.toString() || "Otros";
  let description = formData.get("description")?.toString() || "";
  const paymentMethod = formData.get("payment_method")?.toString() || "cash";
  const deductedProductsRaw = formData.get("deducted_products")?.toString() || "[]";

  const validPaymentMethods = ["cash", "digital"];
  const resolvedMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "cash";

  let deductedProducts: { id: string; name: string; qty: number }[] = [];
  try {
    deductedProducts = JSON.parse(deductedProductsRaw);
  } catch (e) {
    // Ignore invalid JSON
  }

  // Si no hay monto ni productos descontados, error.
  if (amount <= 0 && deductedProducts.length === 0) {
    return { error: "El monto debe ser mayor a 0 o debes seleccionar productos para descontar." };
  }

  const adminSupabase = await createAdminClient();

  // Si hay productos para descontar, actualizamos el inventario y la descripción
  if (deductedProducts.length > 0) {
    let productDesc = "\n(Productos descontados: ";
    const descParts = [];

    for (const p of deductedProducts) {
      if (p.qty <= 0) continue;
      
      // Update stock
      const { data: prodData } = await (adminSupabase as any)
        .from("products")
        .select("stock")
        .eq("id", p.id)
        .eq("tenant_id", tenantId)
        .single();
        
      if (prodData) {
        await (adminSupabase as any)
          .from("products")
          .update({ stock: Math.max(0, prodData.stock - p.qty) })
          .eq("id", p.id)
          .eq("tenant_id", tenantId);
          
        descParts.push(`${p.qty}x ${p.name}`);
      }
    }
    
    if (descParts.length > 0) {
      productDesc += descParts.join(", ") + ")";
      description += productDesc;
    }
  }

  // Insertar el gasto en la caja, pero solo si el monto es > 0 o si queremos que quede registro aunque sea $0.
  // Es útil que quede el registro incluso si es $0 para ver a dónde se fue el inventario.
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
  revalidatePath("/dashboard/inventory");
  return { success: true };
}
