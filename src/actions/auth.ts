"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getBarberCredentialsAction(shopCode: string, pin: string) {
  try {
    const adminSupabase = await createAdminClient();

    // 1. Buscar el tenant por el código corto
    const { data: tenant, error: tenantError } = await adminSupabase
      .from("tenants")
      .select("id")
      .eq("short_code", shopCode)
      .single();

    if (tenantError || !tenant) return { error: "Código de barbería no válido." };

    // 2. Buscar al staff por PIN dentro de ese tenant
    const { data: staff, error: staffError } = await adminSupabase
      .from("tenant_staff")
      .select("*, profile:profiles(id_number)")
      .eq("tenant_id", (tenant as any).id)
      .eq("access_pin", pin)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError || !staff) return { error: "PIN o Código de Barbería incorrecto." };

    const cedula = (staff as any).profile?.id_number;
    if (!cedula) return { error: "No se pudo identificar el usuario." };

    const virtualEmail = `${cedula}@barberos.app`;
    return { email: virtualEmail, password: cedula };
  } catch (error: any) {
    console.error("Barber Login Error:", error);
    return { error: "Error interno del servidor." };
  }
}

export async function resetPasswordAction(formData: FormData) {
  let redirectTo = "";
  try {
    const supabase = await createClient();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!password || password !== confirmPassword) {
      return { error: "Las contraseñas no coinciden." };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: password,
      data: { require_password_change: false }
    });

    if (error) return { error: `Error: ${error.message}` };

    redirectTo = "/dashboard/appointments";
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return { error: error?.message || "Error interno del servidor. Revisa las variables de entorno." };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }
}
