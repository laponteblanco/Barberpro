import { 
  Scissors, 
  CalendarDays,
  CreditCard,
  TrendingUp,
  Smartphone,
  Sparkles
} from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { AuthModals } from "@/components/home/AuthModals";
import { TenantDirectory } from "@/components/home/TenantDirectory";
import { cn } from "@/lib/utils";
import { withTimeout } from "@/lib/performance";

export default async function HomePage() {
  let initialTenants: any[] = [];
  
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tufallback.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'tufallback-anon-key',
      {
        auth: { persistSession: false },
        global: { fetch: fetch }
      }
    );
    
    const { data: tenants, error } = await withTimeout(
      supabase
        .from("tenants")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      15000,
      "Fetch Home Tenants"
    );
    if (error) console.warn("Error fetching tenants:", error);
    initialTenants = tenants || [];
  } catch (error) {
    console.warn("Warning: Could not load tenants for home page:", error);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 font-sans relative overflow-hidden">
      
      {/* Premium Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen opacity-60 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-violet-600/20 blur-[100px] rounded-full mix-blend-screen opacity-50 animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40vw] h-[40vw] bg-blue-500/10 blur-[100px] rounded-full mix-blend-screen opacity-40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-28 space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>BarberOS Premium SaaS</span>
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 leading-[1.1]">
            El sistema definitivo para <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">tu barbería.</span>
          </h1>
          
          <p className="text-lg sm:text-2xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto mt-6">
            Gestiona reservas, controla inventarios, calcula comisiones automáticamente y envía notificaciones por WhatsApp.
          </p>
        </div>

        {/* FEATURES GRID - Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-32 relative">
          {/* Subtle ambient glow behind features */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-blue-500/5 blur-3xl -z-10 rounded-[3rem]"></div>
          
          {[
            { title: "Reservas 24/7", desc: "Tus clientes agendan desde cualquier lugar.", icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-500/10", border: "group-hover:border-blue-500/50", glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]" },
            { title: "Punto de Venta", desc: "Control total de caja, productos y servicios.", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "group-hover:border-emerald-500/50", glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]" },
            { title: "Comisiones", desc: "Cálculo automático para tus barberos.", icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10", border: "group-hover:border-violet-500/50", glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]" },
            { title: "WhatsApp Bot", desc: "Recordatorios automáticos a clientes.", icon: Smartphone, color: "text-pink-400", bg: "bg-pink-500/10", border: "group-hover:border-pink-500/50", glow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]" },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className={cn(
                "group relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 transition-all duration-500 hover:-translate-y-2 hover:bg-slate-800/50 cursor-default",
                feature.border,
                feature.glow
              )}>
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110", feature.bg, feature.color)}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl text-slate-100 font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>

        {/* AUTH SECTION */}
        <div className="relative mb-32 z-20">
           <AuthModals />
        </div>

        {/* CLIENT DIRECTORY */}
        <div className="mt-20">
          <TenantDirectory initialTenants={initialTenants} />
        </div>

      </div>
    </div>
  );
}
