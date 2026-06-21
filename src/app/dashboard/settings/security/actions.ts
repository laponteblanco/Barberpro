"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createAdminUserAction(formData: FormData) {
  const { tenantId, user: currentUser, staff, supabase } = await getSession();

  if (!tenantId || !currentUser || staff?.role !== "owner" || !supabase) {
    return { error: "Solo el dueño puede crear o gestionar administradores." };
  }

  const adminSupabase = await createAdminClient();

  const display_name = formData.get("display_name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  const permissions = {
    manage_staff: formData.get("perm_manage_staff") === "true",
    manage_services: formData.get("perm_manage_services") === "true",
    manage_finances: formData.get("perm_manage_finances") === "true",
    manage_settings: formData.get("perm_manage_settings") === "true",
  };

  if (!display_name || !email || !password) {
    return { error: "Faltan campos obligatorios" };
  }

  // 1. Create a user in Supabase Auth
  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: display_name,
      role: "admin",
      require_password_change: true
    }
  });

  if (authError) {
    return { error: `Error creando credenciales: ${authError.message}` };
  }

  const authUserId = newUser.user.id;

  // 2. Create profile
  const { error: profileError } = await (adminSupabase as any).from("profiles").upsert({
    id: authUserId,
    full_name: display_name,
  });

  if (profileError) {
    return { error: `Error al crear perfil: ${profileError.message}` };
  }

  // 3. Link to tenant_staff with permissions
  const { error: staffError } = await (adminSupabase as any).from("tenant_staff").insert({
    tenant_id: tenantId,
    user_id: authUserId,
    role: "admin",
    display_name,
    is_active: true,
    permissions
  });

  if (staffError) {
    return { error: `Error al asignar rol en la barbería: ${staffError.message}` };
  }

  revalidatePath("/dashboard/settings/security");
  revalidatePath("/dashboard/staff");
  revalidateTag("tenant-data", "default");
  return { success: true };
}

export async function updateAdminPermissionsAction(formData: FormData) {
  const { tenantId, user: currentUser, staff, supabase } = await getSession();

  if (!tenantId || !currentUser || staff?.role !== "owner" || !supabase) {
    return { error: "Solo el dueño puede editar administradores." };
  }

  const staff_id = formData.get("staff_id")?.toString();
  if (!staff_id) return { error: "Falta el ID del administrador" };

  const permissions = {
    manage_staff: formData.get("perm_manage_staff") === "true",
    manage_services: formData.get("perm_manage_services") === "true",
    manage_finances: formData.get("perm_manage_finances") === "true",
    manage_settings: formData.get("perm_manage_settings") === "true",
  };

  const { error } = await (supabase as any)
    .from("tenant_staff")
    .update({ permissions })
    .eq("id", staff_id)
    .eq("tenant_id", tenantId);

  if (error) {
    return { error: `Error actualizando permisos: ${error.message}` };
  }

  revalidatePath("/dashboard/settings/security");
  return { success: true };
}

export async function revokeAdminAction(staffId: string) {
  const { tenantId, user: currentUser, staff, supabase } = await getSession();

  if (!tenantId || !currentUser || staff?.role !== "owner" || !supabase) {
    return { error: "Solo el dueño puede revocar administradores." };
  }

  const { error } = await (supabase as any)
    .from("tenant_staff")
    .update({ role: "receptionist", permissions: {} }) // Regresa a rol básico sin permisos
    .eq("id", staffId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { error: `Error revocando rol: ${error.message}` };
  }

  revalidatePath("/dashboard/settings/security");
  return { success: true };
}
