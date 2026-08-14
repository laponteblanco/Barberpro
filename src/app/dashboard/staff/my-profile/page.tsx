import { Calendar, DollarSign, TrendingUp, User, Scissors, Clock } from "lucide-react";
import { getSession } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";

export default async function BarberProfilePage() {
  const { tenantId, staff } = await getSession();
  if (!tenantId || !staff) redirect("/");

  // Construir enlace de reserva del barbero
  const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://shopbarberospro.netlify.app";
  const bookLink = `${domain}/${staff.tenant?.slug}?barber_id=${staff.id}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Mi Agenda <span className="text-gradient">Personal</span></h1>
          <p className="text-zinc-500 text-sm font-medium mb-3">Controla tus citas y comisiones del día</p>
          <CopyLinkButton link={bookLink} />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <User className="w-7 h-7 text-indigo-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-white/5 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 blur-[40px] group-hover:bg-emerald-500/20 transition-all" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Comisiones Hoy</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-emerald-500">$185.000</h3>
            <span className="text-[10px] font-bold text-zinc-600 mb-1">COP</span>
          </div>
        </div>
        
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-white/5 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 blur-[40px] group-hover:bg-indigo-500/20 transition-all" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Citas Pendientes</p>
          <h3 className="text-3xl font-black text-white">4</h3>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-white/5 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 blur-[40px] group-hover:bg-amber-500/20 transition-all" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Puntuación</p>
          <div className="flex items-center gap-1">
            <h3 className="text-3xl font-black text-amber-500">4.9</h3>
            <span className="text-amber-500/50 text-xs">★</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Próximos Clientes
          </h2>
        </div>
        
        <div className="space-y-3">
          {[
            { time: "14:00", client: "Carlos Mendoza", service: "Corte + Barba", status: "Confirmado" },
            { time: "15:00", client: "Andrés Silva", service: "Degradado", status: "Pendiente" },
            { time: "16:30", client: "Juan Pérez", service: "Corte Clásico", status: "Confirmado" },
          ].map((c) => (
            <div key={c.time} className="glass-card rounded-2xl p-5 border border-white/5 bg-white/5 flex items-center justify-between hover:border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="text-sm font-black text-white">{c.time}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">PM</p>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div>
                  <p className="text-sm font-bold text-white">{c.client}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{c.service}</p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                c.status === 'Confirmado' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {c.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
