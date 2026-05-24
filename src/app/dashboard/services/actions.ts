"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createServiceAction(formData: FormData) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No session" };

  const adminSupabase = await createAdminClient();

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

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars") // Using avatars bucket as it already exists and is public
      .upload(filePath, imageFile);

    if (!uploadError) {
      const { data: { publicUrl } } = adminSupabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      imageUrl = publicUrl;
    }
  }

  const { data: newService, error } = await (adminSupabase as any)
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
  return { success: true, service: newService };
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No session" };

  const adminSupabase = await createAdminClient();

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

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars")
      .upload(filePath, imageFile);

    if (!uploadError) {
      const { data: { publicUrl } } = adminSupabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      imageUrl = publicUrl;
    }
  }

  const { error } = await (adminSupabase as any)
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
  return { success: true };
}
