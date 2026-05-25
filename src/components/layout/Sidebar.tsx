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

export function Sidebar({ 
  tenantName, 
  tenantLogoUrl,
  role = "admin",
  isOpen = false,
  onClose,
}: { 
  tenantName: string, 
  tenantLogoUrl?: string | null,
  role?: string,
  isOpen?: boolean,
  onClose?: () => void
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  const filteredNavItems = navItems.filter(item => {
    if (role === "barber") {
      return ["Citas", "Reportes"].includes(item.label);
    }
    return true;
  });

  // Clear navigation state and close mobile sidebar when pathname changes
  useEffect(() => {
    setIsNavigating(null);
    onClose?.();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={cn(
          "flex flex-col w-64 h-full md:min-h-screen border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] z-50 transition-transform duration-300 ease-in-out md:translate-x-0 pt-safe pb-safe",
          "fixed md:relative top-0 bottom-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Navigation Progress Bar */}
        {isNavigating && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary overflow-hidden z-50">
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

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const isCurrentLoading = isNavigating === item.href;

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
