/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardContainer } from "@/components/layout/DashboardContainer";
import { getSession } from "@/lib/supabase/session";
import ErrorBoundary from "@/components/ErrorBoundary";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, staff } = await getSession();
  
  if (!user) redirect("/");
  
  // 1. Identificar rol
  const role = staff?.role ?? user.user_metadata?.role ?? "admin";
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

  return (
    <ErrorBoundary>
      <DashboardContainer tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} role={role}>
        {children}
      </DashboardContainer>
    </ErrorBoundary>
  );
}
