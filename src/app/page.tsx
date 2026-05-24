"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Scissors, 
  Lock, 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  Briefcase, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Compass, 
  Search,
  Building2,
  CalendarDays,
  Smartphone,
  TrendingUp,
  X,
  ArrowRight
} from "lucide-react";
import { loginAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type UserRole = "superadmin" | "admin" | "barber";

export default function HomePage() {
  // Login States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<UserRole | null>(null);
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Tenant / Barbershop States
  const [tenants, setTenants] = useState<any[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  // Clear fields when modal closes
  useEffect(() => {
    if (!activeModal) {
      setCedula("");
      setPassword("");
      setError(null);
      setShowPassword(false);
    }
  }, [activeModal]);

  // Fetch active tenants from Supabase on mount
  useEffect(() => {
    async function fetchTenants() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
        
        if (error) throw error;
        setTenants(data || []);
        setFilteredTenants(data || []);
      } catch (err) {
        console.error("Error fetching tenants:", err);
      } finally {
        setLoadingTenants(false);
      }
    }
    fetchTenants();
  }, []);

  // Filter tenants based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredTenants(tenants);
    } else {
      setFilteredTenants(
        tenants.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            (t.slug && t.slug.toLowerCase().includes(query)) ||
            (t.city && t.city.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, tenants]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  // Common Modal Form Component
  const renderModalForm = () => {
    if (!activeModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#121214] border border-white/10 w-full max-w-md rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
          <button 
            onClick={() => setActiveModal(null)}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="mb-8">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border",
              activeModal === 'superadmin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
              activeModal === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
            )}>
              {activeModal === 'superadmin' && <ShieldCheck className="w-6 h-6" />}
              {activeModal === 'admin' && <Building2 className="w-6 h-6" />}
              {activeModal === 'barber' && <Briefcase className="w-6 h-6" />}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {activeModal === 'superadmin' && 'Dueño de la App'}
              {activeModal === 'admin' && 'Dueño de Barbería'}
              {activeModal === 'barber' && 'Acceso Barbero'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {activeModal === 'superadmin' && 'Ingresa al panel maestro del SaaS.'}
              {activeModal === 'admin' && 'Gestiona tu barbería, citas y reportes.'}
              {activeModal === 'barber' && 'Revisa tu agenda y comisiones.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-semibold leading-normal">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* We map superadmin to admin login under the hood, but the UI distinguishes them */}
            <input type="hidden" name="role" value={activeModal === 'barber' ? 'barber' : 'admin'} />

            {/* SUPERADMIN & ADMIN */}
            {(activeModal === "admin" || activeModal === "superadmin") && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    Cédula
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <CreditCard className="w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      name="cedula"
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="Ej: 12345678"
                      required
                      disabled={loading}
                      className="w-full h-12 pl-11 pr-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="w-full h-12 pl-11 pr-12 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* BARBER */}
            {activeModal === "barber" && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    Código de Barbería
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building2 className="w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      name="shop_code"
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="Ej: LUIS-AP"
                      required
                      disabled={loading}
                      className="w-full h-12 pl-11 pr-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                    PIN de Acceso (6 dígitos)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      name="pin"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ej: 123456"
                      required
                      disabled={loading}
                      maxLength={6}
                      className="w-full h-12 pl-11 pr-12 bg-black/40 border border-white/10 rounded-2xl text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Ingresar</span>
              )}
            </button>
          </form>
          
          {activeModal === 'admin' && (
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-zinc-500 text-xs font-semibold">
                ¿Aún no tienes cuenta?{" "}
                <Link href="/auth/register?role=admin" className="text-primary hover:underline underline-offset-4">
                  Registra tu barbería aquí
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 blur-[150px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 blur-[150px] rounded-full mix-blend-screen opacity-50" />
      </div>

      {renderModalForm()}

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
          ].map((feature, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 hover:bg-white/[0.04] transition-all">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 border", feature.bg, feature.color, feature.border)}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold mb-2">{feature.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* LOGIN ENTRY POINTS */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight text-white mb-4">Ingresa a tu cuenta</h2>
            <p className="text-zinc-400">Selecciona tu perfil para acceder a las herramientas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Superadmin Card */}
            <button 
              onClick={() => setActiveModal('superadmin')}
              className="group text-left p-8 rounded-[32px] bg-gradient-to-b from-[#1a1525] to-[#120f18] border border-purple-500/20 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 text-purple-500">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck className="w-7 h-7 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Dueño de la App</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    Acceso para el propietario de la plataforma SaaS. Control total de suscripciones, finanzas y barberías registradas.
                  </p>
                </div>
                <div className="text-purple-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                  Ingresar como Master <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Admin Card */}
            <button 
              onClick={() => setActiveModal('admin')}
              className="group text-left p-8 rounded-[32px] bg-gradient-to-b from-[#251e15] to-[#18120f] border border-amber-500/20 hover:border-amber-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 text-amber-500">
                <Building2 className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Building2 className="w-7 h-7 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Dueño de Barbería</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    Gestión integral de tu local. Administra citas, inventario, finanzas, personal y métricas de rendimiento.
                  </p>
                </div>
                <div className="text-amber-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                  Ingresar al Dashboard <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Barber Card */}
            <button 
              onClick={() => setActiveModal('barber')}
              className="group text-left p-8 rounded-[32px] bg-gradient-to-b from-[#151b25] to-[#0f1218] border border-indigo-500/20 hover:border-indigo-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 text-indigo-500">
                <Briefcase className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Briefcase className="w-7 h-7 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Barbero</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    Acceso para el staff. Revisa tu agenda del día, registra servicios completados y lleva el control de tus comisiones.
                  </p>
                </div>
                <div className="text-indigo-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                  Ingresar a mi Agenda <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CLIENT DIRECTORY SECTION */}
        <section className="bg-[#121214] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
                <Compass className="w-8 h-8 text-primary" />
                Directorio para Clientes
              </h2>
              <p className="text-zinc-400">¿Eres cliente? Busca tu barbería y agenda tu próxima cita.</p>
            </div>
            
            <div className="relative group max-w-sm w-full">
              <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar por nombre o ciudad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-black/40 border border-white/10 rounded-2xl text-base placeholder:text-zinc-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-white font-medium shadow-inner"
              />
            </div>
          </div>

          {loadingTenants ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-medium">Cargando barberías disponibles...</p>
            </div>
          ) : filteredTenants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant) => {
                const initials = tenant.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w: string) => w[0])
                  .join("")
                  .toUpperCase();
                
                return (
                  <Link 
                    href={`/${tenant.slug}`}
                    key={tenant.id}
                    className="group p-6 bg-white/[0.02] border border-white/5 hover:border-primary/30 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 flex flex-col justify-between h-[200px] relative overflow-hidden"
                  >
                    <div className="flex items-start gap-5 relative z-10">
                      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-xl font-black text-primary">
                            {initials || "B"}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-primary transition-colors">
                          {tenant.name}
                        </h3>
                        <p className="text-xs text-zinc-400 font-medium truncate mt-1">
                          📍 {tenant.city || "Sede Principal"}
                        </p>
                      </div>
                    </div>

                    <div className="w-full mt-4 h-12 bg-white/5 group-hover:bg-primary text-zinc-300 group-hover:text-black font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm">
                      <span>Agendar Cita</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Compass className="w-10 h-10 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No hay barberías disponibles</h3>
              <p className="text-zinc-400 max-w-md mx-auto">
                {searchQuery 
                  ? "Ninguna barbería coincide con tu búsqueda." 
                  : "Sé el primero en registrar tu negocio en la plataforma."}
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
