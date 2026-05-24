"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Scissors, Lock, CreditCard, Loader2, AlertCircle, User, Briefcase, ShieldCheck } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "barber" | "client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");

  // Limpiar campos al cambiar de rol
  useEffect(() => {
    setCedula("");
    setPassword("");
    setError(null);
  }, [role]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("role", role);
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
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 mb-6">
            <Scissors className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">BarberOS</h1>
          <p className="text-zinc-400 text-sm font-medium">Gestión inteligente para tu barbería</p>
        </div>

        <div className="glass-card rounded-[40px] p-8 border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl">
          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-8 p-1.5 bg-black/20 rounded-2xl border border-white/5">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const isActive = role === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id as UserRole)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-xl transition-all duration-300 relative overflow-hidden group",
                    isActive 
                      ? "bg-white/10 text-white shadow-xl" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className={cn(
                      "absolute inset-0 opacity-10 bg-gradient-to-br",
                      option.id === 'admin' ? 'from-amber-500 to-orange-500' :
                      option.id === 'barber' ? 'from-indigo-500 to-purple-500' :
                      'from-emerald-500 to-teal-500'
                    )} />
                  )}
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive && (
                      option.id === 'admin' ? 'text-amber-500' :
                      option.id === 'barber' ? 'text-indigo-400' :
                      'text-emerald-400'
                    )
                  )} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{option.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Número de Cédula
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CreditCard className="w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  name="cedula"
                  type="text" 
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 12345678"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  name="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <span>Iniciar Sesión como {roleOptions.find(o => o.id === role)?.label}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-zinc-500 text-xs">
              ¿No tienes cuenta? <Link href={`/auth/register?role=${role}`} className="text-primary font-bold hover:underline">Regístrate ahora</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
