"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Lock, 
  Loader2, 
  AlertCircle, 
  Briefcase, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Building2,
  CreditCard,
  X,
  ArrowRight
} from "lucide-react";
import { getBarberCredentialsAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type UserRole = "superadmin" | "admin" | "barber";

export function AuthModals() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!activeModal) {
      setCedula("");
      setPassword("");
      setError(null);
      setShowPassword(false);
    }
  }, [activeModal]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const role = formData.get("role")?.toString() || "admin";
      
      if (role === "barber") {
        const shopCode = formData.get("shop_code")?.toString()?.trim()?.toUpperCase();
        const pin = formData.get("pin")?.toString()?.trim();
        
        if (!shopCode || !pin) {
          setError("Por favor, ingresa el código de la barbería y tu PIN.");
          setLoading(false);
          return;
        }

        const result = await getBarberCredentialsAction(shopCode, pin);
        if (result.error || !result.email || !result.password) {
          setError(result.error || "Error al verificar el PIN.");
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        });

        if (signInError) {
          setError("PIN o Código de Barbería incorrecto.");
          setLoading(false);
          return;
        }
        
        // Guardar el rol activo en cookies antes de redirigir como Barbero
        document.cookie = "active_role=barber; path=/; max-age=31536000; SameSite=Lax; Secure";

        window.location.href = '/dashboard/appointments';
        return;
      }

      // Acceso tradicional para Administrador / Dueño
      const cedulaForm = formData.get("cedula")?.toString()?.trim();
      const pass = formData.get("password")?.toString();
      if (!cedulaForm || !pass) {
        setError("Por favor, ingresa tu credencial y contraseña.");
        setLoading(false);
        return;
      }
      
      const loginEmail = cedulaForm.includes("@") ? cedulaForm : `${cedulaForm}@barberos.app`;
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: pass,
      });

      if (signInError) {
        setError("Cédula o contraseña incorrectas.");
        setLoading(false);
        return;
      }

      // Guardar el rol activo de forma explícita en cookies como Administrador
      const activeRole = data.user?.user_metadata?.role || "admin";
      document.cookie = `active_role=${activeRole}; path=/; max-age=31536000; SameSite=Lax; Secure`;

      if (data.user?.user_metadata?.require_password_change) {
        window.location.href = '/auth/reset-password';
      } else {
        if (activeRole === "superadmin") {
          window.location.href = '/superadmin';
        } else {
          window.location.href = '/dashboard/appointments';
        }
      }
    } catch (err: any) {
      console.error("Client Error:", err);
      setError("Error de conexión. Por favor, intenta nuevamente.");
      setLoading(false);
    }
  }

  return (
    <>
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 w-full max-w-md rounded-[32px] p-8 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
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
              <p className="text-slate-400 text-sm mt-1">
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
              <input type="hidden" name="role" value={activeModal === 'barber' ? 'barber' : 'admin'} />

              {(activeModal === "admin" || activeModal === "superadmin") && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                      Cédula o Correo
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
                        placeholder="Ej: 12345678 o admin@correo.com"
                        required
                        disabled={loading}
                        className="w-full h-12 pl-11 pr-4 bg-black/20 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium"
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
                        className="w-full h-12 pl-11 pr-12 bg-black/20 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
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
                        className="w-full h-12 pl-11 pr-4 bg-black/20 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium uppercase"
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
                        className="w-full h-12 pl-11 pr-12 bg-black/20 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm tracking-wider"
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
                className={cn(
                  "w-full h-12 mt-4 font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm uppercase tracking-wider",
                  activeModal === 'superadmin' ? "bg-purple-500 text-white shadow-purple-500/20 hover:shadow-purple-500/40" :
                  activeModal === 'admin' ? "bg-amber-500 text-black shadow-amber-500/20 hover:shadow-amber-500/40" :
                  "bg-indigo-500 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40"
                )}
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
      )}

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
    </>
  );
}
