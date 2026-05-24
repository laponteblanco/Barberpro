"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  
  const role = formData.get("role")?.toString() || "admin";

  // --- LOGIN PARA BARBEROS (VÍA PIN) ---
  if (role === "barber") {
    const shopCode = formData.get("shop_code")?.toString()?.trim()?.toUpperCase();
    const pin = formData.get("pin")?.toString()?.trim();

    if (!shopCode || !pin) {
      return { error: "Por favor, ingresa el código de la barbería y tu PIN." };
    }

    // 1. Buscar el tenant por el código corto
    const { data: tenant } = await adminSupabase
      .from("tenants")
      .select("id")
      .eq("short_code", shopCode)
      .single();

    if (!tenant) return { error: "Código de barbería no válido." };

    // 2. Buscar al staff por PIN dentro de ese tenant
    const { data: staff } = await adminSupabase
      .from("tenant_staff")
      .select("*, profile:profiles(id_number)")
      .eq("tenant_id", (tenant as any).id)
      .eq("access_pin", pin)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) return { error: "PIN o Código de Barbería incorrecto." };

    const cedula = (staff as any).profile?.id_number;
    if (!cedula) return { error: "No se pudo identificar el usuario." };

    // 3. Login oficial vía Supabase (Email Virtual + Cédula como password)
    const virtualEmail = `${cedula}@barberos.app`;
    const { error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: cedula,
    });

    if (error) return { error: "Error de acceso: PIN incorrecto." };

    redirect("/dashboard/appointments");
  } 
  
  // --- LOGIN PARA ADMINISTRADORES (VÍA CÉDULA + PASSWORD) ---
  else {
    const cedula = formData.get("cedula")?.toString();
    const password = formData.get("password")?.toString();

    if (!cedula || !password) {
      return { error: "Por favor, ingresa tu cédula y contraseña." };
    }

    const virtualEmail = `${cedula}@barberos.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password,
    });

    if (error) return { error: "Cédula o contraseña incorrectas." };

    if (data.user?.user_metadata?.require_password_change) {
      redirect("/auth/reset-password");
    }

    redirect("/dashboard/appointments");
  }
}

export async function resetPasswordAction(formData: FormData) {
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

  redirect("/dashboard/appointments");
}
