/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardContainer } from "@/components/layout/DashboardContainer";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import ErrorBoundary from "@/components/ErrorBoundary";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, staff, activeRole } = await getSession();
  
  if (!user) redirect("/");
  
  // 1. Identificar rol: prioridad para el rol de autenticación del dueño (admin/superadmin)
  const authRole = user.user_metadata?.role;
  let role = (authRole === "admin" || authRole === "superadmin")
    ? authRole
    : (staff?.role ?? authRole ?? "admin");

  // Si se inició sesión explícitamente como barbero usando PIN, aplicar el rol
  if (activeRole === "barber" && (role === "admin" || role === "superadmin" || staff?.role === "barber")) {
    role = "barber";
  } else if (activeRole === "admin" && (authRole === "admin" || authRole === "superadmin")) {
    role = authRole;
  }

  const isAdmin = role === "admin" || role === "superadmin";
  
  // Allow admin/superadmin even if staff record is not yet created
  if (!['admin', 'superadmin', 'barber'].includes(role)) {
    redirect("/");
  }

  // 2. Protección de rutas para Barberos
  const headersList = await headers();
  const fullPath = headersList.get("x-invoke-path") || "";

  if (role === "barber") {
    const allowedPaths = ["/dashboard/appointments", "/dashboard/reports", "/dashboard/staff/my-profile"];
    const isAllowed = allowedPaths.some(p => fullPath.startsWith(p));
    if (!isAllowed && fullPath.startsWith("/dashboard")) {
      redirect("/dashboard/appointments");
    }
  }

  const tenantName = staff?.tenant?.name ?? "Mi Barbería";
  const tenantLogoUrl = staff?.tenant?.logo_url;
  
  // Fetch tenant settings for theme
  const adminSupabase = await createAdminClient();
  const { data: tenantData } = await (adminSupabase as any).from("tenants").select("settings").eq("id", staff?.tenant?.id || user.user_metadata?.tenant_id).single();
  const theme = tenantData?.settings?.theme || "dark";

  const userName: string =
    staff?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "";

  return (
    <ErrorBoundary>
      <div className={`${theme === "light" ? "theme-light" : "theme-dark"} min-h-screen w-full bg-background text-foreground transition-colors duration-500`}>
        <DashboardContainer tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} role={role} userName={userName}>
          {children}
        </DashboardContainer>
      </div>
    </ErrorBoundary>
  );
}
