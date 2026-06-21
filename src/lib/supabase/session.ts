import "server-only";
import { cache } from "react";
import { createClient, createAdminClient } from "./server";
import { cookies } from "next/headers";
import { withTimeout } from "../performance";

/**
 * Cached session helper — deduplicates auth + tenant lookups
 * within a single request lifecycle using React.cache().
 */
export const getSession = cache(async () => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await withTimeout(
    supabase.auth.getSession(),
    5000,
    "Supabase Auth GetSession"
  );

  const user = session?.user;

  // Leer la cookie del rol activo de forma segura
  let activeRole: string | null = null;
  try {
    const cookieStore = await cookies();
    activeRole = cookieStore.get("active_role")?.value || null;
  } catch (e) {
    // Evitar fallos fuera de contexto de petición
  }

  if (!user) return { user: null, staff: null, tenantId: null, supabase, activeRole: null };

  const adminSupabase = await createAdminClient();
  
  // Try to find staff/tenant link and the first tenant
  let staffRes: any = { data: null };
  try {
    console.log("-> Starting staff query...");
    staffRes = await withTimeout(
      adminSupabase
        .from("tenant_staff" as any)
        .select("*, tenant:tenants(id, name, slug, logo_url, settings)" as any)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      10000,
      "Fetch Tenant Staff"
    );
  } catch (error) {
    console.error("Timeout/Error fetching staff:", error);
  }
  
  let fallbackRes: any = { data: null };
  try {
    console.log("-> Starting tenant query...");
    fallbackRes = await withTimeout(
      adminSupabase
        .from("tenants")
        .select("id, name, slug, logo_url, settings")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      10000,
      "Fetch Tenants Fallback"
    );
  } catch (error) {
    console.error("Timeout/Error fetching fallback tenant:", error);
  }
  
  console.log("-> Both queries finished!");

  if (staffRes.data && staffRes.data.length > 0) {
    const allStaff = staffRes.data as any[];
    // Si el usuario tiene múltiples perfiles (ej. admin y barbero), usar el que coincida con activeRole
    let staffData = activeRole 
      ? allStaff.find(s => s.role === activeRole) || allStaff[0]
      : allStaff[0];

    // Impersonación para Dueño (Owner)
    let impersonatedStaffId: string | null = null;
    try {
      const cookieStore = await cookies();
      impersonatedStaffId = cookieStore.get("impersonated_staff_id")?.value || null;
    } catch (e) {
      // Evitar fallos fuera de contexto de petición
    }

    const isOwnerUser = (staffData.role === "owner" || staffData.role === "admin") && user.email && !user.email.endsWith("@barberos.app");

    if (isOwnerUser && impersonatedStaffId) {
      const { data: impersonatedData } = await adminSupabase
        .from("tenant_staff" as any)
        .select("*, tenant:tenants(id, name, slug, logo_url, settings)" as any)
        .eq("id", impersonatedStaffId)
        .eq("tenant_id", staffData.tenant_id)
        .eq("is_active", true)
        .maybeSingle();

      if (impersonatedData) {
        const originalStaff = { ...staffData };
        staffData = {
          ...(impersonatedData as any),
          isImpersonating: true,
          originalStaff
        };
        // Sobreescribir el user.id de forma segura para que todas las operaciones registren bajo el administrador impersonado
        user.id = (impersonatedData as any).user_id;
      }
    }
      
    return {
      user,
      staff: staffData,
      tenantId: staffData.tenant_id,
      supabase,
      activeRole,
    };
  }

  // Fallback auto-reparador para administradores sin vínculo explícito en tenant_staff
  const isAdmin = user.user_metadata?.role === "admin" || user.user_metadata?.role === "superadmin";

  if (isAdmin) {
    let targetTenant = fallbackRes.data as any;

    // Si no existe ninguna barbería en la base de datos, creamos una por defecto
    if (!targetTenant) {
      try {
        const { generateShortCode } = await import("@/lib/utils");
        const { data: newTenant } = await adminSupabase
          .from("tenants")
          .insert({
            name: "Mi Barbería Principal",
            slug: `shop-${user.id.slice(0, 5)}`,
            short_code: generateShortCode("SHOP"),
            is_active: true
          } as any)
          .select()
          .single();
        
        targetTenant = newTenant;
      } catch (e) {
        console.error("Error al auto-crear tenant:", e);
      }
    }

    if (targetTenant) {
      try {
        // Vinculamos permanentemente al administrador en tenant_staff
        const { data: newStaff } = await adminSupabase
          .from("tenant_staff")
          .insert({
            tenant_id: targetTenant.id,
            user_id: user.id,
            display_name: user.user_metadata?.full_name || "Administrador",
            role: 'admin',
            is_active: true
          } as any)
          .select("*, tenant:tenants(id, name, slug, logo_url, settings)")
          .single();

        if (newStaff) {
          return {
            user,
            staff: newStaff as any,
            tenantId: targetTenant.id,
            supabase,
            activeRole,
          };
        }
      } catch (e) {
        console.error("Error al auto-crear tenant_staff:", e);
      }

      // Fallback básico si la inserción fallara
      return {
        user,
        staff: { tenant: targetTenant, role: 'admin' } as any,
        tenantId: targetTenant.id,
        supabase,
        activeRole,
      };
    }
  }

  return {
    user,
    staff: null,
    tenantId: null,
    supabase,
    activeRole,
  };
});
