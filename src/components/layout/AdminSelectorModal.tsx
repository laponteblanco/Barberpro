"use client";

import { useState, useTransition } from "react";
import { setImpersonatedAdmin } from "@/app/dashboard/actions/impersonation";
import { Shield, UserCheck, ArrowRight, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminSelectorModalProps {
  admins: Array<{
    id: string;
    role: string;
    profile?: {
      full_name: string;
      avatar_url?: string | null;
    } | null;
  }>;
  isOpen: boolean;
}

export function AdminSelectorModal({ admins, isOpen }: AdminSelectorModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (staffId: string) => {
    setSelectedId(staffId);
    startTransition(async () => {
      await setImpersonatedAdmin(staffId);
      router.refresh();
    });
  };

  const handleContinueAsOwner = () => {
    setSelectedId("owner");
    startTransition(async () => {
      // Set session cookie to avoid prompting again
      document.cookie = "skip_admin_selector=true; path=/; SameSite=Lax; Secure";
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Selección de Administrador</h2>
          <p className="text-sm text-zinc-400">
            Estás iniciando sesión como Dueño. Para registrar movimientos en el dashboard, por favor selecciona con qué Administrador operarás hoy.
          </p>
        </div>

        {/* Admins List */}
        <div className="px-8 py-2 max-h-[300px] overflow-y-auto space-y-3">
          {admins.length === 0 ? (
            <div className="bg-zinc-950/40 rounded-2xl border border-white/5 p-6 text-center">
              <p className="text-sm text-zinc-500 font-medium">No hay administradores registrados aún.</p>
              <p className="text-xs text-zinc-600 mt-1">Crea un perfil de Administrador en la sección de Staff.</p>
            </div>
          ) : (
            admins.map((admin) => {
              const isCurrent = selectedId === admin.id;
              return (
                <button
                  key={admin.id}
                  onClick={() => handleSelect(admin.id)}
                  disabled={isPending}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group ${
                    isCurrent
                      ? "bg-primary/20 border-primary text-white"
                      : "bg-zinc-950/40 border-white/5 text-zinc-300 hover:bg-white/[0.02] hover:border-white/10"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 overflow-hidden shrink-0">
                    {admin.profile?.avatar_url ? (
                      <img src={admin.profile.avatar_url} alt={admin.profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white tracking-tight truncate">{admin.profile?.full_name || "Administrador"}</p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Rol: {admin.role}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary group-hover:border-primary/20 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 flex flex-col gap-3">
          <button
            onClick={handleContinueAsOwner}
            disabled={isPending}
            className="w-full py-4 px-6 rounded-2xl bg-zinc-950 border border-white/5 hover:border-white/10 text-sm font-bold text-zinc-300 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <UserCheck className="w-4.5 h-4.5" />
            Continuar como Dueño
          </button>
        </div>
      </div>
    </div>
  );
}
