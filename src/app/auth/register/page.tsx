"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserPlus, ShieldCheck, Phone, CreditCard, ArrowRight, Loader2, Lock, User, Eye, EyeOff } from "lucide-react";
import { signUpAction } from "./actions";

function RegisterContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "admin";
  const isClient = role === "client";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const cedula = formData.get("cedula") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    const email = formData.get("email") as string;
    const shopName = formData.get("shopName") as string;

    try {
      const result = await signUpAction({
        cedula,
        name,
        phone,
        password,
        role,
        email,
        shopName
      });

      if (result.error) {
        setError(result.error);
      } else {
        window.location.href = isClient ? "/portal" : "/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido durante el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className={`w-16 h-16 ${isClient ? 'bg-emerald-500' : 'bg-primary'} rounded-2xl mx-auto flex items-center justify-center shadow-2xl ${isClient ? 'shadow-emerald-500/20' : 'shadow-primary/20'} mb-6 transition-colors duration-500`}>
            {isClient ? <User className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-primary-foreground" />}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">BarberOS</h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            {isClient ? "Crea tu Cuenta de Cliente" : "Crea tu Cuenta de Administrador"}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 border-white/5 bg-white/5 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 text-destructive text-sm animate-in shake duration-300">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nombre Completo</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input name="name" type="text" placeholder="Ej: Luis Aponte" required className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cédula</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input name="cedula" type="text" placeholder="12345678" required className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input name="phone" type="tel" placeholder="0412..." required className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" />
                  </div>
                </div>
              </div>

              {!isClient && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nombre de la Barbería</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input name="shopName" type="text" placeholder="Ej: BarberShop VIP" required className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input name="email" type="email" placeholder="ejemplo@correo.com" required className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    required 
                    className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary transition-all" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white focus:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                <>
                  Completar Registro
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-zinc-500 text-xs">
              ¿Ya tienes cuenta? <Link href="/" className="text-primary font-bold hover:underline">Inicia sesión aquí</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
