"use server";

import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const dayHoursSchema = z.object({
  open: z.boolean().default(true),
  start: z.number().min(0).max(23).default(8),
  end: z.number().min(0).max(23).default(20),
});

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string(),
  short_code: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().default("CO"),
  currency: z.string().default("COP"),
  logo_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  business_start: z.number().min(0).max(23).default(8),
  business_end: z.number().min(0).max(23).default(20),
  business_hours_by_day: z.array(dayHoursSchema).length(7).optional(),
  security_pin: z.string().optional().nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export async function updateTenantProfile(data: ProfileFormData) {
  const { user, tenantId } = await getSession();

  if (!user || !tenantId) {
    return { error: "No autorizado" };
  }

  const adminSupabase = await createAdminClient();

  // Validate data
  const validated = profileSchema.safeParse(data);
  if (!validated.success) {
    console.error("Validation error:", validated.error);
    return { error: "Datos inválidos" };
  }

  const { data: tenantData } = await (adminSupabase as any)
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const currentSettings = tenantData?.settings || {};
  const updatedSettings = {
    ...currentSettings,
    business_hours: {
      start: validated.data.business_start,
      end: validated.data.business_end
    },
    ...(validated.data.business_hours_by_day && {
      business_hours_by_day: validated.data.business_hours_by_day
    }),
    ...(validated.data.security_pin !== undefined && {
      security_pin: validated.data.security_pin
    })
  };

  const { error } = await (adminSupabase as any)
    .from("tenants")
    .update({
      name: validated.data.name,
      slug: validated.data.slug,
      city: validated.data.city,
      country: validated.data.country,
      currency: validated.data.currency,
      logo_url: validated.data.logo_url,
      phone: validated.data.phone,
      email: validated.data.email || null,
      address: validated.data.address,
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (error) {
    console.error("Update error:", error);
    return { error: "No se pudo actualizar el perfil" };
  }

  // Forzar revalidación de todo el dashboard para actualizar sidebar
  revalidatePath("/dashboard", "layout");
  revalidateTag("tenant-data", "default");
  
  return { success: true };
}
