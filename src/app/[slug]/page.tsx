import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingPortal } from "@/components/booking/BookingPortal";

export default async function PublicBookingPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  
  let adminSupabase;
  try {
    adminSupabase = await createAdminClient();
  } catch (err) {
    console.error("[PublicBookingPage] Failed to create admin client:", err);
    notFound();
  }

  // Fetch tenant info
  const { data: tenant, error } = await (adminSupabase as any)
    .from("tenants")
    .select("*, services(*), tenant_staff(*, profiles(*))")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("[PublicBookingPage] Error fetching tenant for slug:", slug, error);
    notFound();
  }

  if (!tenant) {
    console.error("[PublicBookingPage] No tenant found for slug:", slug);
    notFound();
  }

  // Filter active staff (barbers and owners, not admin-only roles)
  const activeStaff = (tenant.tenant_staff ?? [])
    .filter((s: any) => s.is_active && s.role !== 'admin')
    .map((s: any) => ({
      id: s.id,
      name: s.profiles?.full_name ?? s.display_name ?? "Barbero",
      avatar: s.profiles?.avatar_url ?? s.avatar_url ?? null
    }));

  const activeServices = (tenant.services ?? []).filter((s: any) => s.is_active);
  const theme = tenant.settings?.theme || "dark";

  return (
    <main className={`min-h-screen ${theme === "light" ? "theme-light" : "theme-dark"} bg-background text-foreground selection:bg-primary/30 transition-colors duration-500`}>
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" 
          style={{ transform: 'translate3d(0,0,0)', willChange: 'filter' }}
        />
        <div 
          className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" 
          style={{ animationDelay: '2s', transform: 'translate3d(0,0,0)', willChange: 'filter' }} 
        />
      </div>

      <BookingPortal 
        tenant={tenant}
        staff={activeStaff}
        services={activeServices}
      />
    </main>
  );
}
