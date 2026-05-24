import { ChevronLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { BarbershopProfileForm } from "@/components/settings/BarbershopProfileForm";

export default async function ProfileSettingsPage() {
  const { user, tenantId, supabase } = await getSession();

  if (!user || !tenantId) {
    redirect("/auth/login");
  }

  const adminSupabase = await createAdminClient();

  const { data: tenant } = await (adminSupabase as any)
    .from("tenants")
    .select("name, slug, short_code, city, country, currency, logo_url, phone, email, address, settings")
    .eq("id", tenantId)
    .single();

  const initialData = {
    ...tenant,
    short_code: tenant?.short_code || "SIN-CODIGO",
    business_start: tenant?.settings?.business_hours?.start || 8,
    business_end: tenant?.settings?.business_hours?.end || 20,
  };

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="w-12 h-12 text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold">No se encontró información del local</h2>
        <p className="text-zinc-500 text-sm mt-2">Contacta al soporte técnico si este error persiste.</p>
        <Link href="/dashboard/settings" className="mt-6 text-primary hover:underline">Regresar a ajustes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col gap-6">
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-primary transition-colors group w-fit"
        >
          <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-primary/30 transition-all">
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
          VOLVER A AJUSTES
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" /> Perfil de Barbería
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configura la identidad pública y ubicación de tu local</p>
        </div>
      </div>

      <BarbershopProfileForm initialData={initialData as any} />
    </div>
  );
}
