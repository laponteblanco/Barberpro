"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addStaffAction(formData: FormData) {
  const { tenantId, user: currentUser, staff } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "admin" || staff?.role === "owner" || currentUser?.user_metadata?.role === "admin";
  if (!tenantId || !currentUser || !isAuthorized) {
    throw new Error("No autorizado para gestionar el personal.");
  }

  const adminSupabase = await createAdminClient();

  const display_name = formData.get("display_name")?.toString();
  const role = formData.get("role")?.toString();
  const id_number = formData.get("id_number")?.toString();
  const avatarFile = formData.get("avatar") as File;

  const compensation_type = formData.get("compensation_type")?.toString() || 'percentage';
  const commission_rate = parseFloat(formData.get("commission_rate")?.toString() || "0");
  const rent_amount = parseFloat(formData.get("rent_amount")?.toString() || "0");

  if (!display_name || !id_number) throw new Error("Faltan campos obligatorios");

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
  const access_pin = Math.floor(100000 + Math.random() * 900000).toString();

  const { error: staffError } = await (adminSupabase as any).from("tenant_staff").upsert({
    tenant_id: tenantId,
    user_id: authUserId,
    role,
    compensation_type,
    commission_rate,
    rent_amount,
    access_pin,
    is_active: true
  }, { onConflict: 'tenant_id, user_id' });

  if (staffError) {
    console.error("Staff Insert Error:", staffError);
    return { error: `Error al vincular staff: ${staffError.message}` };
  }

  revalidatePath("/dashboard/staff");
  return { success: true, pin: access_pin };
}

export async function editStaffAction(formData: FormData) {
  const { tenantId, user: currentUser, staff } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "admin" || staff?.role === "owner" || currentUser?.user_metadata?.role === "admin";
  if (!tenantId || !currentUser || !isAuthorized) {
    throw new Error("No autorizado para gestionar el personal.");
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

  if (!staff_id || !user_id || !display_name || !id_number) throw new Error("Faltan campos obligatorios");

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

  // 2. Update tenant_staff
  const { error: staffError } = await (adminSupabase as any).from("tenant_staff").update({
    role,
    compensation_type,
    commission_rate,
    rent_amount,
    is_active
  }).eq("id", staff_id).eq("tenant_id", tenantId);

  if (staffError) {
    console.error("Staff Update Error:", staffError);
    return { error: `Error al actualizar staff: ${staffError.message}` };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function deleteStaffAction(staffId: string) {
  const { tenantId, user: currentUser, staff } = await getSession();

  // SEGURIDAD: Solo admins o dueños pueden gestionar el staff
  const isAuthorized = staff?.role === "admin" || staff?.role === "owner" || currentUser?.user_metadata?.role === "admin";
  if (!tenantId || !currentUser || !isAuthorized) {
    throw new Error("No autorizado para eliminar personal.");
  }

  const adminSupabase = await createAdminClient();

  // Cambiamos DELETE por UPDATE para no romper la integridad de las citas (Soft Delete)
  const { error } = await (adminSupabase as any)
    .from("tenant_staff")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Staff Deactivation Error:", error);
    return { error: `Error al desactivar staff: ${error.message}` };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}
