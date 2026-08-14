import { getSuperAdminDashboard } from "@/actions/superadmin";
import { Store, Users, TrendingUp, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function SuperAdminDashboardPage() {
  const kpis = await getSuperAdminDashboard();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Panel Maestro</h1>
        <p className="text-slate-400 mt-1">Vista global de todas las barberías y el rendimiento de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Barberías Activas</p>
              <p className="text-2xl font-bold text-white">{kpis.activeTenants} / {kpis.totalTenants}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Barberos</p>
              <p className="text-2xl font-bold text-white">{kpis.totalBarbers}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Licencias Expiran Pronto</p>
              <p className="text-2xl font-bold text-white">{kpis.expiringLicenses}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">MRR</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(kpis.mrr)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
