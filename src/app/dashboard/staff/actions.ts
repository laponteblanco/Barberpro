"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function addStaffAction(formData: FormData) {
  const { tenantId, user: currentUser, staff } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !currentUser || !isAuthorized) {
    return { error: "No autorizado para gestionar el personal." };
  }

  const adminSupabase = await createAdminClient();

  const display_name = formData.get("display_name")?.toString();
  const role = formData.get("role")?.toString();
  const id_number = formData.get("id_number")?.toString();
  const avatarFile = formData.get("avatar") as File;

  const compensation_type = formData.get("compensation_type")?.toString() || 'percentage';
  const commission_rate = parseFloat(formData.get("commission_rate")?.toString() || "0");
  const rent_amount = parseFloat(formData.get("rent_amount")?.toString() || "0");

  if (!display_name || !id_number) return { error: "Faltan campos obligatorios" };

  let avatarUrl = "";
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${id_number}_${Date.now()}.${fileExt}`;
    const filePath = `staff/${fileName}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars")
      .upload(filePath, avatarFile);

    if (!uploadError) {
      const { data: { publicUrl } } = adminSupabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      avatarUrl = publicUrl;
    }
  }

  // 1. Create a virtual user (Agile Auth) for the staff member
  let authUserId = "";

  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: `${id_number}@barberos.app`,
    password: id_number,
    email_confirm: true,
    user_metadata: {
      full_name: display_name,
      id_number: id_number,
      role: role,
      require_password_change: true
    }
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      // User already exists (probably from a previous failed attempt or as a client)
      const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === `${id_number}@barberos.app`);

      if (!existingUser) {
        return { error: "No se pudo recuperar el usuario existente." };
      }
      authUserId = existingUser.id;
    } else {
      console.error("Auth Admin Error:", authError);
      return { error: `Error de autenticación: ${authError.message}` };
    }
  } else {
    authUserId = newUser.user.id;
  }

  // 2. Create profile
  const { error: profileError } = await (adminSupabase as any).from("profiles").upsert({
    id: authUserId,
    full_name: display_name,
    id_number: id_number,
    avatar_url: avatarUrl
  });

  if (profileError) {
    console.error("Profile Upsert Error:", profileError);
    return { error: `Error al crear perfil: ${profileError.message}` };
  }

  // 3. Link to tenant_staff with generated PIN
  // 3. Link to tenant_staff with generated PIN and daily commissions
  const access_pin = Math.floor(100000 + Math.random() * 900000).toString();

  const daily_commission_rates = {
    "0": parseFloat(formData.get("daily_commission_0")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "1": parseFloat(formData.get("daily_commission_1")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "2": parseFloat(formData.get("daily_commission_2")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "3": parseFloat(formData.get("daily_commission_3")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "4": parseFloat(formData.get("daily_commission_4")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "5": parseFloat(formData.get("daily_commission_5")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "6": parseFloat(formData.get("daily_commission_6")?.toString() || formData.get("commission_rate")?.toString() || "0")
  };

  const staffData: any = {
    tenant_id: tenantId,
    user_id: authUserId,
    role,
    compensation_type,
    commission_rate,
    rent_amount,
    access_pin,
    is_active: true,
    daily_commission_rates
  };

  let { error: staffError } = await (adminSupabase as any)
    .from("tenant_staff")
    .upsert(staffData, { onConflict: 'tenant_id, user_id' });

  if (staffError) {
    console.warn("Staff insert with daily_commission_rates failed, retrying without it:", staffError);
    const fallbackData = { ...staffData };
    delete fallbackData.daily_commission_rates;

    const fallbackRes = await (adminSupabase as any)
      .from("tenant_staff")
      .upsert(fallbackData, { onConflict: 'tenant_id, user_id' });
    
    staffError = fallbackRes.error;
  }

  if (staffError) {
    console.error("Staff Insert Error:", staffError);
    return { error: `Error al vincular staff: ${staffError.message}` };
  }

  revalidatePath("/dashboard/staff");
  revalidateTag("tenant-data", "default");
  return { success: true, pin: access_pin };
}

export async function editStaffAction(formData: FormData) {
  const { tenantId, user: currentUser, staff } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !currentUser || !isAuthorized) {
    return { error: "No autorizado para gestionar el personal." };
  }

  const adminSupabase = await createAdminClient();

  const staff_id = formData.get("staff_id")?.toString();
  const user_id = formData.get("user_id")?.toString();
  const display_name = formData.get("display_name")?.toString();
  const id_number = formData.get("id_number")?.toString();
  const role = formData.get("role")?.toString();
  const is_active = formData.get("is_active") === "true";
  const avatarFile = formData.get("avatar") as File;

  const compensation_type = formData.get("compensation_type")?.toString() || 'percentage';
  const commission_rate = parseFloat(formData.get("commission_rate")?.toString() || "0");
  const rent_amount = parseFloat(formData.get("rent_amount")?.toString() || "0");

  if (!staff_id || !user_id || !display_name || !id_number) return { error: "Faltan campos obligatorios" };

  let avatarUrl = formData.get("current_avatar")?.toString() || "";
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user_id}_${Date.now()}.${fileExt}`;
    const filePath = `staff/${fileName}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars")
      .upload(filePath, avatarFile);

    if (!uploadError) {
      const { data: { publicUrl } } = adminSupabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      avatarUrl = publicUrl;
    }
  }

  // 1. Update Profile (Full Name & ID Number)
  const { error: profileError } = await (adminSupabase as any).from("profiles").update({
    full_name: display_name,
    avatar_url: avatarUrl,
    id_number: id_number
  }).eq("id", user_id);

  if (profileError) {
    console.error("Profile Update Error:", profileError);
    return { error: `Error al actualizar perfil: ${profileError.message}` };
  }

  // 2. Update tenant_staff with daily commissions
  const daily_commission_rates = {
    "0": parseFloat(formData.get("daily_commission_0")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "1": parseFloat(formData.get("daily_commission_1")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "2": parseFloat(formData.get("daily_commission_2")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "3": parseFloat(formData.get("daily_commission_3")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "4": parseFloat(formData.get("daily_commission_4")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "5": parseFloat(formData.get("daily_commission_5")?.toString() || formData.get("commission_rate")?.toString() || "0"),
    "6": parseFloat(formData.get("daily_commission_6")?.toString() || formData.get("commission_rate")?.toString() || "0")
  };

  const updateData: any = {
    role,
    compensation_type,
    commission_rate,
    rent_amount,
    is_active,
    daily_commission_rates
  };

  // Parse and include barber working hours if provided
  const workingHoursRaw = formData.get("working_hours")?.toString();
  if (workingHoursRaw) {
    try {
      const parsed = JSON.parse(workingHoursRaw);
      if (Array.isArray(parsed) && parsed.length === 7) {
        updateData.working_hours = parsed;
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  // Parse and include specialties (services)
  const specialtiesRaw = formData.get("specialties")?.toString();
  if (specialtiesRaw) {
    try {
      const parsed = JSON.parse(specialtiesRaw);
      if (Array.isArray(parsed)) {
        updateData.specialties = parsed;
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  let { error: staffError } = await (adminSupabase as any)
    .from("tenant_staff")
    .update(updateData)
    .eq("id", staff_id)
    .eq("tenant_id", tenantId);

  if (staffError) {
    console.warn("Staff update with daily_commission_rates failed, retrying without it:", staffError);
    const fallbackData = { ...updateData };
    delete fallbackData.daily_commission_rates;

    const fallbackRes = await (adminSupabase as any)
      .from("tenant_staff")
      .update(fallbackData)
      .eq("id", staff_id)
      .eq("tenant_id", tenantId);
    
    staffError = fallbackRes.error;
  }

  if (staffError) {
    console.error("Staff Update Error:", staffError);
    return { error: `Error al actualizar staff: ${staffError.message}` };
  }

  revalidatePath("/dashboard/staff");
  revalidateTag("tenant-data", "default");
  return { success: true };
}

export async function deleteStaffAction(staffId: string) {
  const { tenantId, user: currentUser, staff, supabase } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !currentUser || !isAuthorized || !supabase) {
    return { error: "No autorizado para eliminar personal." };
  }

  // PREVENCIÓN: El dueño nunca se puede eliminar
  const { data: memberToDelete, error: fetchError } = await (supabase as any)
    .from("tenant_staff")
    .select("role")
    .eq("id", staffId)
    .single();

  if (fetchError || !memberToDelete) {
    return { error: "No se encontró el miembro del personal a eliminar." };
  }

  if (memberToDelete.role === "owner") {
    return { error: "El dueño de la barbería no puede ser eliminado." };
  }

  // Cambiamos DELETE por UPDATE para no romper la integridad de las citas (Soft Delete)
  const { error } = await (supabase as any)
    .from("tenant_staff")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Staff Deactivation Error:", error);
    return { error: `Error al desactivar staff: ${error.message}` };
  }

  revalidatePath("/dashboard/staff");
  revalidateTag("tenant-data", "default");
  return { success: true };
}

export async function getLedgerDataAction(staffId: string) {
  try {
    const { tenantId, user: currentUser, supabase } = await getSession();
    if (!tenantId || !currentUser || !supabase) {
      return { error: "No autorizado" };
    }

    // Query ledger history with products join
    const { data: history, error } = await (supabase as any)
      .from("staff_ledger")
      .select("*, products(name, retail_price)")
      .eq("staff_id", staffId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ledger data:", error);
      return { error: error.message };
    }

    let totalAdvances = 0;
    let totalConsignments = 0;
    let totalPayments = 0;

    history?.forEach((item: any) => {
      const amt = Number(item.amount || 0);
      if (item.type === "advance") {
        totalAdvances += amt;
      } else if (item.type === "consignment") {
        totalConsignments += amt;
      } else if (item.type === "payment") {
        totalPayments += amt;
      }
    });

    const pendingBalance = totalAdvances + totalConsignments - totalPayments;

    return {
      success: true,
      history: history || [],
      totals: {
        totalAdvances,
        totalConsignments,
        totalPayments,
        pendingBalance
      }
    };
  } catch (err: any) {
    console.error("getLedgerDataAction error:", err);
    return { error: err.message || "Error al obtener datos financieros" };
  }
}

export async function getTenantProductsAction() {
  try {
    const { tenantId, supabase } = await getSession();
    if (!tenantId || !supabase) return { error: "No autorizado" };

    // Fetch active products with stock > 0
    const { data: products, error } = await (supabase as any)
      .from("products")
      .select("id, name, retail_price, stock")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .gt("stock", 0)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      return { error: error.message };
    }

    return { success: true, products: products || [] };
  } catch (err: any) {
    console.error("getTenantProductsAction error:", err);
    return { error: err.message || "Error al obtener productos" };
  }
}

export async function addLedgerTransactionAction(formData: FormData) {
  try {
    const { tenantId, user: currentUser, staff, supabase } = await getSession();

    // Only owners or admins can manage transactions
    const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
    if (!tenantId || !currentUser || !isAuthorized || !supabase) {
      return { error: "No autorizado para registrar movimientos financieros." };
    }

    const staffId = formData.get("staff_id")?.toString();
    const type = formData.get("type")?.toString(); // 'advance' | 'consignment' | 'payment'
    const amountStr = formData.get("amount")?.toString() || "0";
    const amount = Number(amountStr.replace(/[^0-9]/g, ""));
    const description = formData.get("description")?.toString() || "";
    const productId = formData.get("product_id")?.toString() || null;

    if (!staffId || !type || amount <= 0) {
      return { error: "Datos del movimiento no válidos. El monto debe ser mayor a 0." };
    }

    // 1. Handle stock deduction if product consignment
    let productQty = null;
    if (type === "consignment" && productId) {
      // Fetch product to verify stock
      const { data: product, error: prodError } = await (supabase as any)
        .from("products")
        .select("stock, name")
        .eq("id", productId)
        .eq("tenant_id", tenantId)
        .single();

      if (prodError || !product) {
        return { error: "Producto no encontrado en inventario." };
      }

      if (product.stock <= 0) {
        return { error: `Stock insuficiente para '${product.name}'. El stock actual es 0.` };
      }

      // Deduct stock by 1
      const { error: updateStockError } = await (supabase as any)
        .from("products")
        .update({ stock: product.stock - 1 })
        .eq("id", productId);

      if (updateStockError) {
        console.error("Deduct stock error:", updateStockError);
        return { error: "No se pudo actualizar el inventario del producto." };
      }

      productQty = 1;
    }

    // 2. Insert into ledger
    const { error: insertError } = await (supabase as any)
      .from("staff_ledger")
      .insert({
        tenant_id: tenantId,
        staff_id: staffId,
        type,
        amount,
        description,
        product_id: productId,
        product_quantity: productQty
      });

    if (insertError) {
      console.error("Ledger insert error:", insertError);
      // Rollback stock deduction if it was a consignment
      if (type === "consignment" && productId) {
        const { data: product } = await (supabase as any)
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();
        if (product) {
          await (supabase as any).from("products").update({ stock: product.stock + 1 }).eq("id", productId);
        }
      }
      return { error: `Error al registrar en el historial: ${insertError.message}` };
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/staff");
  revalidateTag("tenant-data", "default");
    return { success: true };
  } catch (err: any) {
    console.error("addLedgerTransactionAction error:", err);
    return { error: err.message || "Error al registrar movimiento" };
  }
}

export async function deleteLedgerTransactionAction(transactionId: string) {
  try {
    const { tenantId, user: currentUser, staff, supabase } = await getSession();

    // Only owners or admins can manage transactions
    const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
    if (!tenantId || !currentUser || !isAuthorized || !supabase) {
      return { error: "No autorizado para eliminar movimientos financieros." };
    }

    // 1. Fetch transaction details to see if stock needs to be restored
    const { data: transaction, error: fetchError } = await (supabase as any)
      .from("staff_ledger")
      .select("*")
      .eq("id", transactionId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !transaction) {
      return { error: "Movimiento financiero no encontrado." };
    }

    // 2. Restore stock if it was a product consignment
    if (transaction.type === "consignment" && transaction.product_id && transaction.product_quantity) {
      const { data: product } = await (supabase as any)
        .from("products")
        .select("stock")
        .eq("id", transaction.product_id)
        .single();
      
      if (product) {
        await (supabase as any)
          .from("products")
          .update({ stock: product.stock + transaction.product_quantity })
          .eq("id", transaction.product_id);
      }
    }

    // 3. Delete from ledger
    const { error: deleteError } = await (supabase as any)
      .from("staff_ledger")
      .delete()
      .eq("id", transactionId);

    if (deleteError) {
      console.error("Ledger delete error:", deleteError);
      return { error: `Error al eliminar el movimiento: ${deleteError.message}` };
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (err: any) {
    console.error("deleteLedgerTransactionAction error:", err);
    return { error: err.message || "Error al eliminar movimiento" };
  }
}
