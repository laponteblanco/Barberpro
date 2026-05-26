import { Users, Search, Phone, Mail, FileText } from "lucide-react";
import { getClients } from "@/services/clients.service";
import { AddClientDialog } from "./AddClientDialog";
import { EditClientDialog } from "./EditClientDialog";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<any> }) {
  const { q } = await searchParams;
  const clients = await getClients(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Directorio de Clientes</h1>
          <p className="text-muted-foreground text-sm">Gestiona la base de datos de clientes y su historial</p>
        </div>
        <AddClientDialog />
      </div>

      <div className="bg-zinc-950 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl min-h-[400px]">
        <div className="p-6 border-b border-white/5 bg-zinc-900/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              name="q"
              defaultValue={q}
              type="text" 
              placeholder="Buscar por nombre, teléfono o email..." 
              className="w-full pl-11 pr-4 h-12 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-white"
            />
          </form>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Total Registrados: <span className="text-primary ml-1">{clients.length}</span>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="py-20 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto border border-zinc-700/50 mb-6">
              <Users className="w-10 h-10 text-zinc-600" />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">Directorio vacío</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                No se encontraron clientes. Comienza a registrar a tus clientes para llevar su historial.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/30">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Contacto</th>

                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((client: any) => (
                  <tr key={client.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shrink-0">
                          {client.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base tracking-tight">{client.full_name}</p>
                          {client.notes ? (
                            <p className="text-[10px] text-zinc-500 font-medium tracking-widest mt-0.5 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-primary/70" /> Tiene notas
                            </p>
                          ) : (
                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest mt-0.5">Sin notas</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-primary/70" />
                          <span className="text-sm text-zinc-300 font-medium">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <EditClientDialog client={client} />
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
