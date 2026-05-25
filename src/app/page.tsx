import { 
  Scissors, 
  CalendarDays,
  CreditCard,
  TrendingUp,
  Smartphone
} from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AuthModals } from "@/components/home/AuthModals";
import { TenantDirectory } from "@/components/home/TenantDirectory";
import { cn } from "@/lib/utils";

// Activar ISR en Netlify (Revalidar la página cada 60 segundos)
export const revalidate = 60;

export default async function HomePage() {
  // Fetch active tenants from Supabase en el servidor (Sin cookies para permitir renderizado estático real)
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tufallback.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'tufallback-anon-key'
  );
  
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
    
  if (error) {
    console.error("Error fetching tenants:", error);
  }

  const initialTenants = tenants || [];

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 blur-[150px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 blur-[150px] rounded-full mix-blend-screen opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-primary mb-4 backdrop-blur-md">
            <Scissors className="w-4 h-4" />
            <span>BarberOS SaaS</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 leading-tight">
            El sistema definitivo para <br />
            <span className="text-primary">tu barbería.</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto">
            Gestiona reservas, controla inventarios, calcula comisiones automáticamente y envía notificaciones por WhatsApp a tus clientes. Todo en un solo lugar.
          </p>
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
          {[
            { title: "Reservas 24/7", desc: "Tus clientes agendan desde cualquier lugar.", icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
            { title: "Punto de Venta", desc: "Control total de caja, productos y servicios.", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
            { title: "Comisiones", desc: "Cálculo automático para tus barberos.", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
            { title: "WhatsApp Bot", desc: "Recordatorios automáticos a clientes.", icon: Smartphone, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 hover:bg-white/[0.04] transition-all">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 border", feature.bg, feature.color, feature.border)}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        {/* COMPONENTES CLIENTE INTERACTIVOS */}
        <AuthModals />

        {/* CLIENT DIRECTORY COMPONENT */}
        <TenantDirectory initialTenants={initialTenants} />

      </div>
    </div>
  );
}
