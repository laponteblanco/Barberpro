"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface DashboardContainerProps {
  tenantName: string;
  tenantLogoUrl?: string | null;
  role: string;
  userName?: string;
  children: React.ReactNode;
}

export function DashboardContainer({
  tenantName,
  tenantLogoUrl,
  role,
  userName,
  children,
}: DashboardContainerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        {/* Page content scroll container */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 animate-fade-up pb-safe">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
