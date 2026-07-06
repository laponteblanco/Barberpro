export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true
};

import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingPortal } from "@/components/booking/BookingPortal";
import { Suspense } from "react";
import BookingLoading from "./loading";
import { getCachedTenantData } from "@/lib/cache/tenant";

export default async function PublicBookingPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ barber_id?: string }>
}) {
  const { slug } = await params;
  const { barber_id } = await searchParams;

  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingContent slug={slug} initialBarberId={barber_id} />
    </Suspense>
  );
}

async function BookingContent({ slug, initialBarberId }: { slug: string, initialBarberId?: string }) {
  // adminSupabase client creation is now handled inside getCachedTenantData

  // Fetch tenant info using cache
  const tenant = await getCachedTenantData(slug);

  if (!tenant) {
    console.error("[PublicBookingPage] Tenant not found for slug:", slug);
    notFound();
  }

  // Filter active staff (barbers and owners, not admin-only roles)
  const activeStaff = (tenant.tenant_staff ?? [])
    .filter((s: any) => s.is_active && s.role !== 'admin')
    .map((s: any) => ({
      id: s.id,
      name: s.profiles?.full_name ?? s.display_name ?? "Barbero",
      avatar: s.profiles?.avatar_url ?? s.avatar_url ?? null,
      specialties: s.specialties ?? [] // IDs de servicios habilitados para este barbero
    }));

  const activeServices = (tenant.services ?? [])
    .filter((s: any) => s.is_active)
    .sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0));
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
        initialBarberId={initialBarberId}
      />
    </main>
  );
}
