"use server";

import { getSession } from "@/lib/supabase/session";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { productSchema, type ProductFormValues } from "./schema";

export async function createProductAction(data: ProductFormValues) {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { error: "No autorizado" };

    const adminSupabase = await createAdminClient();

    const { error } = await (adminSupabase as any).from("products").insert({
      ...data,
      tenant_id: tenantId,
    });

    if (error) {
      console.error("Supabase Error:", error);
      return { error: error.message || "Error desconocido en la base de datos" };
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("Create Product Error:", err);
    return { error: err.message || "Error al crear el producto" };
  }
}

export async function updateProductAction(id: string, data: ProductFormValues) {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { error: "No autorizado" };

    const adminSupabase = await createAdminClient();

    const { error } = await (adminSupabase as any)
      .from("products")
      .update(data)
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Update Error:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("Update Product Error:", err);
    return { error: err.message || "Error al actualizar el producto" };
  }
}

export async function sellProductAction(productId: string, quantity: number) {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { error: "No autorizado" };

    const adminSupabase = await createAdminClient();
    
    const { data: product } = await (adminSupabase as any)
      .from("products")
      .select("stock, retail_price")
      .eq("id", productId)
      .eq("tenant_id", tenantId)
      .single();

    if (!product) return { error: "Producto no encontrado" };
    if (product.stock < quantity) return { error: "Stock insuficiente" };

    const { error } = await (adminSupabase as any)
      .from("products")
      .update({ stock: product.stock - quantity })
      .eq("id", productId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Sale Error:", error);
      return { error: error.message };
    }

    // Record the sale in product_sales table
    const { error: saleError } = await (adminSupabase as any).from("product_sales").insert({
      tenant_id: tenantId,
      product_id: productId,
      quantity: quantity,
      unit_price: product.retail_price,
      total_price: product.retail_price * quantity
    });

    if (saleError) {
      console.error("Sale Record Error:", saleError);
      return { error: saleError.message };
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("Sell Product Error:", err);
    return { error: err.message || "Error al procesar la venta" };
  }
}

export async function reverseSaleAction(saleId: string) {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { error: "No autorizado" };

    const adminSupabase = await createAdminClient();

    // 1. Get sale details
    const { data: sale } = await (adminSupabase as any)
      .from("product_sales")
      .select("product_id, quantity")
      .eq("id", saleId)
      .eq("tenant_id", tenantId)
      .single();

    if (!sale) return { error: "Venta no encontrada" };

    // 2. Get current product stock
    const { data: product } = await (adminSupabase as any)
      .from("products")
      .select("stock")
      .eq("id", sale.product_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!product) return { error: "Producto asociado no encontrado" };

    // 3. Increment stock and delete sale
    const { error: stockError } = await (adminSupabase as any)
      .from("products")
      .update({ stock: (product.stock || 0) + sale.quantity })
      .eq("id", sale.product_id);

    if (stockError) return { error: stockError.message };

    const { error: deleteError } = await (adminSupabase as any)
      .from("product_sales")
      .delete()
      .eq("id", saleId);

    if (deleteError) return { error: deleteError.message };

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    console.error("Reverse Sale Error:", err);
    return { error: err.message || "Error al reversar la venta" };
  }
}

export async function getSalesByDateAction(dateStr: string) {
  const { tenantId } = await getSession();
  if (!tenantId) throw new Error("No autorizado");

  const { getDailySales } = await import("@/services/products.service");
  const sales = await getDailySales(new Date(dateStr));
  return sales;
}

