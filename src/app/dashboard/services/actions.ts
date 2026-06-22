"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createServiceAction(formData: FormData) {
  const { tenantId, supabase, staff, user: currentUser } = await getSession();
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !supabase || !isAuthorized) return { error: "No autorizado para crear servicios" };

  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const duration_minutes = parseInt(formData.get("duration_minutes")?.toString() || "0", 10);
  const price = parseFloat(formData.get("price")?.toString() || "0");
  const category = formData.get("category")?.toString() || "";
  const is_active = formData.get("is_active") === "true";
  const imageFile = formData.get("image") as File;

  if (!name) return { error: "El nombre es obligatorio" };

  let imageUrl = "";
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
    const filePath = `services/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars") // Using avatars bucket as it already exists and is public
      .upload(filePath, imageFile);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      imageUrl = publicUrl;
    }
  }

  const { data: newService, error } = await (supabase as any)
    .from("services")
    .insert([{ 
      name,
      description,
      duration_minutes,
      price,
      category,
      is_active,
      image_url: imageUrl,
      tenant_id: tenantId 
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating service:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/appointments");
  revalidateTag("tenant-data", "default");
  return { success: true, service: newService };
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const { tenantId, supabase, staff, user: currentUser } = await getSession();
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !supabase || !isAuthorized) return { error: "No autorizado para editar servicios" };

  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const duration_minutes = parseInt(formData.get("duration_minutes")?.toString() || "0", 10);
  const price = parseFloat(formData.get("price")?.toString() || "0");
  const category = formData.get("category")?.toString() || "";
  const is_active = formData.get("is_active") === "true";
  const imageFile = formData.get("image") as File;

  if (!name) return { error: "El nombre es obligatorio" };

  let imageUrl = formData.get("current_image")?.toString() || "";
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
    const filePath = `services/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, imageFile);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      imageUrl = publicUrl;
    }
  }

  const { error } = await (supabase as any)
    .from("services")
    .update({
      name,
      description,
      duration_minutes,
      price,
      category,
      is_active,
      image_url: imageUrl
    })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error updating service:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/appointments");
  revalidateTag("tenant-data", "default");
  return { success: true };
}

export async function deleteServiceAction(serviceId: string) {
  const { tenantId, supabase, staff, user: currentUser } = await getSession();
  const isAuthorized = staff?.role === "owner" || staff?.role === "admin" || currentUser?.user_metadata?.role === "superadmin";
  if (!tenantId || !supabase || !isAuthorized) return { error: "No autorizado para eliminar servicios" };

  const { error } = await (supabase as any)
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error deleting service:", error);
    if (error.code === '23503') { // Foreign key violation
      return { error: "No se puede eliminar el servicio porque ya tiene citas o registros asociados. Por favor, cambia su estado a Inactivo." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/appointments");
  revalidateTag("tenant-data", "default");
  return { success: true };
}
