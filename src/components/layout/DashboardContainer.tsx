"use client";

import { useState, useTransition } from "react";
import { Menu, ShieldAlert } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { clearImpersonatedAdmin } from "@/app/dashboard/actions/impersonation";
import { useRouter } from "next/navigation";

interface DashboardContainerProps {
  tenantName: string;
  tenantLogoUrl?: string | null;
  role: string;
  userName?: string;
  isImpersonating?: boolean;
  children: React.ReactNode;
}

export function DashboardContainer({
  tenantName,
  tenantLogoUrl,
  role,
  userName,
  isImpersonating = false,
  children,
}: DashboardContainerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStopImpersonating = () => {
    // Also clear the skip admin selector cookie so it prompts again if they want
    document.cookie = "skip_admin_selector=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    startTransition(async () => {
      await clearImpersonatedAdmin();
      router.refresh();
    });
  };

  return (
    <div className="flex h-screen md:min-h-screen bg-background overflow-hidden relative">
      {/* Sidebar Component */}
      <Sidebar
        tenantName={tenantName}
        tenantLogoUrl={tenantLogoUrl}
        role={role}
        userName={userName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (Only visible on small devices) */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] md:hidden shrink-0 pt-safe">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-foreground truncate max-w-[200px]">
              {tenantName}
            </span>
          </div>
          <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            BarberOS
          </div>
        </header>

        {/* Impersonation Alert Banner */}
        {isImpersonating && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 text-amber-400 text-center sm:text-left">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <ShieldAlert className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Modo Impersonación</p>
                <p className="text-xs text-zinc-300 font-medium">Actuando en nombre del administrador: <strong className="text-white">{userName}</strong></p>
              </div>
            </div>
            <button
              onClick={handleStopImpersonating}
              disabled={isPending}
              className="text-xs font-bold text-amber-400 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 px-4 py-2 rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 shrink-0 shadow-lg"
            >
              Salir de Impersonación
            </button>
          </div>
        )}

        {/* Page content scroll container */}
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6 lg:p-8 pb-safe">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
