"use client";

import { useState } from "react";
import { Lock, ShieldCheck, Loader2, AlertCircle, Scissors } from "lucide-react";
import { resetPasswordAction } from "@/actions/auth";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await resetPasswordAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-6">
            <ShieldCheck className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Seguridad Requerida</h1>
          <p className="text-zinc-400 text-sm font-medium">Por tu seguridad, debes actualizar tu contraseña inicial (Cédula) antes de continuar.</p>
        </div>

        <div className="glass-card rounded-[40px] p-8 border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Nueva Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input 
                  name="password"
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Confirmar Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                </div>
                <input 
                  name="confirmPassword"
                  type="password" 
                  placeholder="Repite la contraseña"
                  required
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-amber-500 text-black font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar y Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
