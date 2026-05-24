"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Scissors, Lock, CreditCard, Loader2, AlertCircle, Briefcase, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "barber";

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Limpiar campos al cambiar de rol
  useEffect(() => {
    setCedula("");
    setPassword("");
    setError(null);
    setShowPassword(false);
  }, [role]);

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

  const roleOptions = [
    { id: "admin", label: "Admin", icon: ShieldCheck, color: "amber" },
    { id: "barber", label: "Barbero", icon: Briefcase, color: "indigo" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 mb-8 border border-white/10 group hover:scale-105 transition-transform duration-500">
            <Scissors className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">BarberOS</h1>
          <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">Sistema de Gestión Profesional</p>
        </div>

        <div className="glass-card rounded-[40px] p-10 border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-4 mb-10 p-1.5 bg-black/40 rounded-[24px] border border-white/5">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const isActive = role === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id as UserRole)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-[20px] transition-all duration-500 relative overflow-hidden group",
                    isActive
                      ? "bg-white/10 text-white shadow-2xl ring-1 ring-white/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className={cn(
                      "absolute inset-0 opacity-15 bg-gradient-to-br transition-opacity duration-500",
                      option.id === 'admin' ? 'from-amber-500 to-orange-600' :
                        'from-indigo-500 to-purple-600'
                    )} />
                  )}
                  <Icon className={cn(
                    "w-6 h-6 transition-all duration-500 group-hover:scale-110",
                    isActive && (
                      option.id === 'admin' ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                        'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                    )
                  )} />
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">{option.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-[24px] flex items-center gap-4 text-red-500 text-sm animate-in shake duration-500">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <input type="hidden" name="role" value={role} />
            
            {/* CAMPOS PARA ADMIN */}
            {role === "admin" && (
              <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">
                    Número de Cédula
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <CreditCard className="w-5 h-5 text-zinc-600 group-focus-within:text-primary transition-colors duration-300" />
                    </div>
                    <input
                      name="cedula"
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="Ingresa tu ID"
                      required
                      disabled={loading}
                      className="w-full h-16 pl-14 pr-6 bg-black/20 border border-white/10 rounded-[24px] text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all duration-300 disabled:opacity-50 text-lg font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">
                    Contraseña
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-zinc-600 group-focus-within:text-primary transition-colors duration-300" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      className="w-full h-16 pl-14 pr-14 bg-black/20 border border-white/10 rounded-[24px] text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all duration-300 disabled:opacity-50 text-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-8 flex items-center text-primary hover:text-white transition-colors z-10"
                    >
                      <div className="bg-zinc-800/50 p-2 rounded-full border border-white/10">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPOS PARA BARBERO */}
            {role === "barber" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">
                    Código de Barbería
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Scissors className="w-5 h-5 text-zinc-600 group-focus-within:text-primary transition-colors duration-300" />
                    </div>
                    <input
                      name="shop_code"
                      type="text"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="Ej: MI-BAR"
                      required
                      disabled={loading}
                      className="w-full h-16 pl-14 pr-6 bg-black/20 border border-white/10 rounded-[24px] text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all duration-300 disabled:opacity-50 text-lg font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-2">
                    PIN de 6 dígitos
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-zinc-600 group-focus-within:text-primary transition-colors duration-300" />
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
                      className="w-full h-16 pl-14 pr-14 bg-black/20 border border-white/10 rounded-[24px] text-white placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all duration-300 disabled:opacity-50 text-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-8 flex items-center text-primary hover:text-white transition-colors z-10"
                    >
                      <div className="bg-zinc-800/50 p-2 rounded-full border border-white/10">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-primary text-primary-foreground font-black rounded-[24px] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-4 disabled:opacity-70 text-lg uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Entrar como {roleOptions.find(o => o.id === role)?.label}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-zinc-500 text-xs font-medium">
              ¿Eres nuevo administrador? <Link href="/auth/register?role=admin" className="text-primary font-black hover:underline underline-offset-4 ml-1">Crea tu barbería aquí</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
          Powered by Antigravity Engine
        </p>
      </div>
    </div>
  );
}
