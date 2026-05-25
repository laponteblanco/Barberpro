/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
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
      <div className="flex min-h-screen bg-background">
        <Sidebar tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} role={role} />
        <main className="flex-1 flex flex-col min-h-screen overflow-auto">
          <div className="flex-1 p-6 lg:p-8 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
