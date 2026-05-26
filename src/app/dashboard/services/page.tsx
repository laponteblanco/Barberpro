import { List, Scissors, Clock, DollarSign, Tag, CheckCircle2, XCircle } from "lucide-react";
import { getBarberServices } from "@/services/barber-services.service";
import { AddServiceDialog } from "./AddServiceDialog";
import { EditServiceDialog } from "./EditServiceDialog";

export default async function ServicesPage() {
  const services = await getBarberServices();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona el catálogo de cortes, arreglos y spa</p>
        </div>
        <AddServiceDialog />
      </div>

      <div className="bg-zinc-950 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl min-h-[400px]">
        <div className="p-6 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Total Servicios Activos: <span className="text-indigo-500 ml-1">{services.filter((s: any) => s.is_active).length}</span>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="py-20 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto border border-zinc-700/50 mb-6">
              <Scissors className="w-10 h-10 text-zinc-600" />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">Catálogo vacío</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Comienza a añadir los servicios que ofreces para que tus clientes puedan agendar citas.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/30">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Servicio</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-center">Duración</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Precio</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Estado</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((service: any) => (
                  <tr key={service.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0 relative overflow-hidden">
                          {service.image_url ? (
                            <img src={service.image_url} alt={service.name} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <List className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base tracking-tight">{service.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-indigo-500/70" /> {service.category || 'General'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-white/5 text-zinc-300">
                        <Clock className="w-4 h-4 text-indigo-500/70" />
                        <span className="text-sm font-medium">{service.duration_minutes} min</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-white">${service.price}</span>
                        <span className="text-zinc-500 text-xs font-medium">COP</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        service.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                      )}>
                        {service.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {service.is_active ? "Activo" : "Inactivo"}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <EditServiceDialog service={service} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
