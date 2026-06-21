import { listTenants } from "@/actions/superadmin";
import { Store, MoreVertical, Settings, Activity } from "lucide-react";

export default async function SuperAdminTenantsPage() {
  const result = await listTenants();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Barberías Registradas</h1>
        <p className="text-slate-400 mt-1">Gestión global de clientes del SaaS.</p>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Barbería</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Métricas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {result.tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Store className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{tenant.name}</span>
                        <span className="text-xs text-slate-400 font-medium">/{tenant.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        tenant.subscription.plan === 'pro' ? 'bg-indigo-500/10 text-indigo-400' :
                        tenant.subscription.plan === 'premium' ? 'bg-violet-500/10 text-violet-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {tenant.subscription.plan}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      tenant.subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                      tenant.subscription.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {tenant.subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-4 text-sm text-slate-400">
                      <div className="flex flex-col items-end">
                        <span className="text-white font-medium">{tenant.staff_count}</span>
                        <span className="text-[10px] uppercase">Staff</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-white font-medium">{tenant.services_count}</span>
                        <span className="text-[10px] uppercase">Servicios</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {result.tenants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No hay barberías registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
