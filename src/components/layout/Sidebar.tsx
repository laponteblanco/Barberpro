"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Scissors,
  Package,
  BarChart3,
  Settings,
  MessageSquare,
  LogOut,
  ChevronRight,
  List,
  Coins,
  X,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { icon: Calendar, label: "Citas", href: "/dashboard/appointments" },
  { icon: Users, label: "Clientes", href: "/dashboard/clients" },
  { icon: Scissors, label: "Staff", href: "/dashboard/staff" },
  { icon: Package, label: "Inventario", href: "/dashboard/inventory" },
  { icon: Coins, label: "Caja", href: "/dashboard/caja" },
  { icon: List, label: "Servicios", href: "/dashboard/services" },
  { icon: BarChart3, label: "Reportes", href: "/dashboard/reports" },
  { icon: MessageSquare, label: "WhatsApp", href: "/dashboard/whatsapp" },
  { icon: Settings, label: "Ajustes", href: "/dashboard/settings" },
];

// Módulos que un barbero puede acceder
const BARBER_ALLOWED = ["Citas", "Reportes"];

export function Sidebar({ 
  tenantName, 
  tenantLogoUrl,
  role = "admin",
  userName,
  isOpen = false,
  onClose,
}: { 
  tenantName: string, 
  tenantLogoUrl?: string | null,
  role?: string,
  userName?: string,
  isOpen?: boolean,
  onClose?: () => void
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const [lockedTooltip, setLockedTooltip] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "superadmin";
  const isBarber = role === "barber";

  // Para barberos: mostrar TODOS los módulos, pero marcar los bloqueados
  const itemsWithAccess = navItems.map(item => ({
    ...item,
    locked: isBarber && !BARBER_ALLOWED.includes(item.label),
  }));

  // Initials for avatar
  const initials = userName
    ? userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (isAdmin ? "AD" : "BR");

  // Clear navigation state and close mobile sidebar when pathname changes
  useEffect(() => {
    setIsNavigating(null);
    onClose?.();
  }, [pathname]);

  // Close tooltip on outside click
  useEffect(() => {
    if (!lockedTooltip) return;
    const handler = () => setLockedTooltip(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [lockedTooltip]);

  const handleLogout = async () => {
    // Limpiar la cookie del rol activo al cerrar sesión
    document.cookie = "active_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "flex flex-col w-64 h-full md:min-h-screen border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] z-[100] transition-transform duration-300 ease-in-out md:translate-x-0 pt-safe pb-safe",
          "fixed md:relative top-0 bottom-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Navigation Progress Bar */}
        {isNavigating && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary overflow-hidden z-[110]">
            <div className="w-full h-full bg-white/20 animate-[loading-bar_1.5s_infinite_linear]" />
          </div>
        )}

        {/* Logo & Close Button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-950 flex items-center justify-center glow-sm flex-shrink-0 overflow-hidden border border-zinc-800/50 shadow-inner">
              {tenantLogoUrl ? (
                <img src={tenantLogoUrl} alt={tenantName} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Scissors className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none mb-1.5">
                BarberOS
              </p>
              <p className="text-sm font-bold text-foreground truncate leading-tight">
                {tenantName}
              </p>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground md:hidden transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Info & Role Badge */}
        <div className="px-4 py-3 border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold border",
              isAdmin
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-blue-500/15 border-blue-500/30 text-blue-400"
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {userName || (isAdmin ? "Administrador" : "Barbero")}
              </p>
              {/* Role Badge */}
              <div className="mt-0.5">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {role === "superadmin" ? "Super Admin" : "Administrador"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                    <UserRound className="w-2.5 h-2.5" />
                    Barbero
                  </span>
                )}
              </div>
            </div>
          </div>
          {isBarber && (
            <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
              Acceso a módulos habilitados por el admin.
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {isBarber && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">
              Mis módulos
            </p>
          )}
          {itemsWithAccess.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const isCurrentLoading = isNavigating === item.href;

            // Módulo bloqueado para barbero
            if (item.locked) {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedTooltip(lockedTooltip === item.href ? null : item.href);
                  }}
                >
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed select-none opacity-35"
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0 text-zinc-500" />
                    <span className="flex-1 text-zinc-500">{item.label}</span>
                    <Lock className="w-3 h-3 text-zinc-600" />
                  </div>
                  {/* Locked tooltip */}
                  {lockedTooltip === item.href && (
                    <div className="absolute left-0 right-0 z-50 mx-2 -bottom-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 shadow-xl animate-fade-up">
                      Solo administradores tienen acceso.
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) setIsNavigating(item.href);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  active
                    ? "sidebar-active text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCurrentLoading && "opacity-70 grayscale-[0.5]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    isCurrentLoading && "animate-pulse"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {active && !isCurrentLoading && (
                  <ChevronRight className="w-3.5 h-3.5 text-primary opacity-60" />
                )}
                {isCurrentLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-[hsl(var(--sidebar-border))] pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
