import { Shield, ChevronLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { AdminModal } from "./AdminModal";
import { RevokeAdminButton } from "./RevokeAdminButton";

export default async function SecurityPage() {
  const { tenantId, user, staff, supabase } = await getSession();

  if (!tenantId || !user || !supabase) redirect("/login");

  // Only owners can access this page
  if (staff?.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p className="text-slate-500 mt-2">Solo el dueño de la barbería puede configurar la seguridad.</p>
        <Link href="/dashboard/settings" className="mt-6 text-indigo-400 hover:text-indigo-300">
          Volver a Configuración
        </Link>
      </div>
    );
  }

  // Fetch all admins for this tenant
  const { data: adminsData } = await supabase
    .from("tenant_staff")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "owner"])
    .order("role", { ascending: false }); // owner first
  
  const admins = adminsData as any[];

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/settings"
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seguridad y Permisos</h1>
          <p className="text-muted-foreground text-sm">Gestiona quiénes tienen acceso de administrador</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800/50 rounded-2xl p-6">
        <div>
          <h2 className="font-bold text-lg text-white">Administradores del Sistema</h2>
          <p className="text-sm text-slate-400">Controla el acceso granular a los módulos de tu plataforma.</p>
        </div>
        <AdminModal />
      </div>

      <div className="grid gap-4">
        {admins?.map((admin) => (
          <div key={admin.id} className="glass-card bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl uppercase ${admin.role === 'owner' ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                {admin.display_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{admin.display_name}</h3>
                  {admin.role === 'owner' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      Dueño
                    </span>
                  )}
                  {admin.role === 'admin' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      Admin
                    </span>
                  )}
                </div>
                {admin.role === 'owner' ? (
                  <p className="text-sm text-slate-500 mt-1">Acceso total e irrestricto</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {admin.permissions?.manage_staff && <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Staff</span>}
                    {admin.permissions?.manage_services && <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Servicios</span>}
                    {admin.permissions?.manage_finances && <span className="text-xs px-2 py-1 rounded bg-slate-800 text-emerald-400">Finanzas</span>}
                    {admin.permissions?.manage_settings && <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Ajustes</span>}
                    {(!admin.permissions || Object.keys(admin.permissions).every(k => !admin.permissions[k])) && (
                      <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">Sin permisos habilitados</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {admin.role !== 'owner' && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <AdminModal 
                  existingAdmin={admin} 
                  trigger={
                    <button className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
                      Permisos
                    </button>
                  } 
                />
                <RevokeAdminButton staffId={admin.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
